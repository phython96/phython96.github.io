// Mini Minecraft — a tiny voxel sandbox for the homepage.
// Lazy-loads Three.js (UMD r134) only when the user enters /play.
(function () {
    var THREE; // populated after lazy-load

    // ---- world constants ----
    var SIZE = 28;          // world is SIZE x SIZE columns
    var MAX_REACH = 6;      // how far you can break/place
    var EYE = 1.62, P_HALF = 0.3, P_TOP = 1.8; // player AABB
    var GRAVITY = -26, JUMP = 8.6, SPEED = 4.6, SPRINT = 7.4;

    // block type -> color (Minecraft-ish flat colors)
    var BLOCKS = {
        1: 0x69b34c, // grass
        2: 0x8a5a3b, // dirt
        3: 0x9a9a9a, // stone
        4: 0x6e4b2a, // wood
        5: 0x4fae3e  // leaves
    };
    var HOTBAR = [1, 2, 3, 4, 5];

    // ---- runtime state ----
    var scene, camera, renderer, raf;
    var world = new Map();            // "x,y,z" -> type
    var meshes = {};                  // type -> InstancedMesh
    var boxGeo, materials = {};
    var player = { x: 0, y: 0, z: 0, vy: 0, onGround: false };
    var yaw = 0, pitch = 0;
    var keys = {};
    var selected = 0;
    var playing = false, built = false;
    var els = {};
    var raycaster, ndcCenter;
    var lastT = 0;

    function key(x, y, z) { return x + ',' + y + ',' + z; }
    function solid(x, y, z) { return world.has(key(x, y, z)); }

    // deterministic PRNG
    function mulberry32(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            var t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    function heightAt(x, z) {
        var h = 6
            + 2.2 * Math.sin(x * 0.45)
            + 2.2 * Math.cos(z * 0.40)
            + 1.4 * Math.sin((x + z) * 0.30);
        h = Math.floor(h);
        return Math.max(2, h);
    }

    function generate() {
        world.clear();
        var rng = mulberry32(20260601);
        for (var x = 0; x < SIZE; x++) {
            for (var z = 0; z < SIZE; z++) {
                var h = heightAt(x, z);
                for (var y = 0; y <= h; y++) {
                    var t = 3;                       // stone
                    if (y === h) t = 1;              // grass on top
                    else if (y >= h - 2) t = 2;      // dirt band
                    world.set(key(x, y, z), t);
                }
                // occasional tree (keep off the edges)
                if (x > 2 && x < SIZE - 3 && z > 2 && z < SIZE - 3 && rng() < 0.03) {
                    plantTree(x, h + 1, z);
                }
            }
        }
    }

    function plantTree(x, baseY, z) {
        var trunk = 4;
        for (var i = 0; i < trunk; i++) world.set(key(x, baseY + i, z), 4);
        var top = baseY + trunk;
        for (var dx = -2; dx <= 2; dx++)
            for (var dz = -2; dz <= 2; dz++)
                for (var dy = -1; dy <= 0; dy++) {
                    if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
                    setLeaf(x + dx, top + dy, z + dz);
                }
        for (var ex = -1; ex <= 1; ex++)
            for (var ez = -1; ez <= 1; ez++) {
                if (Math.abs(ex) === 1 && Math.abs(ez) === 1) continue;
                setLeaf(x + ex, top + 1, z + ez);
            }
    }
    function setLeaf(x, y, z) { if (!world.has(key(x, y, z))) world.set(key(x, y, z), 5); }

    function exposed(x, y, z) {
        return !solid(x + 1, y, z) || !solid(x - 1, y, z) ||
            !solid(x, y + 1, z) || !solid(x, y - 1, z) ||
            !solid(x, y, z + 1) || !solid(x, y, z - 1);
    }

    function rebuild() {
        Object.keys(meshes).forEach(function (t) {
            scene.remove(meshes[t]);
            meshes[t].dispose();
        });
        meshes = {};
        var byType = {};
        world.forEach(function (t, k) {
            var p = k.split(',');
            var x = +p[0], y = +p[1], z = +p[2];
            if (exposed(x, y, z)) (byType[t] = byType[t] || []).push([x, y, z]);
        });
        var dummy = new THREE.Object3D();
        Object.keys(byType).forEach(function (t) {
            var coords = byType[t];
            var im = new THREE.InstancedMesh(boxGeo, materials[t], coords.length);
            for (var i = 0; i < coords.length; i++) {
                dummy.position.set(coords[i][0] + 0.5, coords[i][1] + 0.5, coords[i][2] + 0.5);
                dummy.updateMatrix();
                im.setMatrixAt(i, dummy.matrix);
            }
            im.instanceMatrix.needsUpdate = true;
            im.userData.coords = coords;
            scene.add(im);
            meshes[t] = im;
        });
    }

    // ---- collision: axis-separated AABB vs voxels ----
    function collides(x, y, z) {
        var x0 = Math.floor(x - P_HALF), x1 = Math.floor(x + P_HALF);
        var y0 = Math.floor(y), y1 = Math.floor(y + P_TOP - 1e-4);
        var z0 = Math.floor(z - P_HALF), z1 = Math.floor(z + P_HALF);
        for (var xi = x0; xi <= x1; xi++)
            for (var yi = y0; yi <= y1; yi++)
                for (var zi = z0; zi <= z1; zi++)
                    if (solid(xi, yi, zi)) return true;
        return false;
    }

    function move(dt) {
        var speed = (keys['shift']) ? SPRINT : SPEED;
        var f = 0, s = 0;
        if (keys['w']) f += 1;
        if (keys['s']) f -= 1;
        if (keys['d']) s += 1;
        if (keys['a']) s -= 1;
        var len = Math.hypot(f, s) || 1;
        f /= len; s /= len;
        var sin = Math.sin(yaw), cos = Math.cos(yaw);
        // forward is -Z rotated by yaw
        var dx = (s * cos - f * sin) * speed * dt;
        var dz = (-s * sin - f * cos) * speed * dt;

        if (!collides(player.x + dx, player.y, player.z)) player.x += dx;
        if (!collides(player.x, player.y, player.z + dz)) player.z += dz;

        player.vy += GRAVITY * dt;
        var ny = player.y + player.vy * dt;
        if (!collides(player.x, ny, player.z)) {
            player.y = ny;
            player.onGround = false;
        } else {
            if (player.vy < 0) player.onGround = true;
            player.vy = 0;
        }
        if (keys[' '] && player.onGround) { player.vy = JUMP; player.onGround = false; }

        // fell off the world -> respawn
        if (player.y < -20) spawn();
    }

    function spawn() {
        var cx = Math.floor(SIZE / 2), cz = Math.floor(SIZE / 2);
        player.x = cx + 0.5;
        player.z = cz + 0.5;
        player.y = heightAt(cx, cz) + 1.2;
        player.vy = 0;
    }

    function targetBlock() {
        raycaster.setFromCamera(ndcCenter, camera);
        raycaster.far = MAX_REACH;
        var hits = raycaster.intersectObjects(Object.keys(meshes).map(function (t) { return meshes[t]; }), false);
        if (!hits.length) return null;
        var h = hits[0];
        var c = h.object.userData.coords[h.instanceId];
        var n = h.face.normal;
        return { coord: c, normal: [Math.round(n.x), Math.round(n.y), Math.round(n.z)] };
    }

    function breakBlock() {
        var t = targetBlock();
        if (!t) return;
        var c = t.coord;
        if (c[1] <= 0) return; // keep bedrock floor
        world.delete(key(c[0], c[1], c[2]));
        rebuild();
    }

    function placeBlock() {
        var t = targetBlock();
        if (!t) return;
        var x = t.coord[0] + t.normal[0];
        var y = t.coord[1] + t.normal[1];
        var z = t.coord[2] + t.normal[2];
        if (solid(x, y, z)) return;
        // don't place inside the player
        var px0 = Math.floor(player.x - P_HALF), px1 = Math.floor(player.x + P_HALF);
        var py0 = Math.floor(player.y), py1 = Math.floor(player.y + P_TOP - 1e-4);
        var pz0 = Math.floor(player.z - P_HALF), pz1 = Math.floor(player.z + P_HALF);
        if (x >= px0 && x <= px1 && y >= py0 && y <= py1 && z >= pz0 && z <= pz1) return;
        world.set(key(x, y, z), HOTBAR[selected]);
        rebuild();
    }

    // ---- render loop ----
    function loop(t) {
        raf = requestAnimationFrame(loop);
        var dt = Math.min(0.05, (t - lastT) / 1000 || 0);
        lastT = t;
        if (playing) move(dt);
        camera.position.set(player.x, player.y + EYE, player.z);
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        renderer.render(scene, camera);
    }

    // ---- setup ----
    function buildScene() {
        var stage = els.stage;
        scene = new THREE.Scene();
        var sky = 0x9fd2ff;
        scene.background = new THREE.Color(sky);
        scene.fog = new THREE.Fog(sky, SIZE * 0.7, SIZE * 1.7);

        camera = new THREE.PerspectiveCamera(72, stage.clientWidth / stage.clientHeight, 0.1, 1000);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(stage.clientWidth, stage.clientHeight);
        stage.insertBefore(renderer.domElement, stage.firstChild);

        scene.add(new THREE.HemisphereLight(0xffffff, 0x6b5436, 0.95));
        var sun = new THREE.DirectionalLight(0xffffff, 0.55);
        sun.position.set(0.6, 1, 0.4);
        scene.add(sun);

        boxGeo = new THREE.BoxGeometry(1, 1, 1);
        Object.keys(BLOCKS).forEach(function (t) {
            materials[t] = new THREE.MeshLambertMaterial({ color: BLOCKS[t] });
        });

        raycaster = new THREE.Raycaster();
        ndcCenter = new THREE.Vector2(0, 0);

        generate();
        rebuild();
        spawn();
        built = true;

        window.addEventListener('resize', onResize);
        lastT = performance.now();
        loop(lastT);
    }

    function onResize() {
        if (!renderer) return;
        var stage = els.stage;
        camera.aspect = stage.clientWidth / stage.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(stage.clientWidth, stage.clientHeight);
    }

    // ---- input / pointer lock ----
    function onLockChange() {
        playing = (document.pointerLockElement === els.stage);
        els.overlay.classList.toggle('hidden', playing);
        els.hotbar.setAttribute('aria-hidden', String(!playing));
        els.hotbar.classList.toggle('visible', playing);
        if (!playing) setStatus(strings.paused, false);
    }
    function onMouseMove(e) {
        if (!playing) return;
        yaw -= e.movementX * 0.0024;
        pitch -= e.movementY * 0.0024;
        var lim = Math.PI / 2 - 0.01;
        pitch = Math.max(-lim, Math.min(lim, pitch));
    }
    function onMouseDown(e) {
        if (!playing) return;
        if (e.button === 0) breakBlock();
        else if (e.button === 2) placeBlock();
    }
    function onKey(e, down) {
        var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (k === 'Shift') k = 'shift';
        keys[k] = down;
        if (down && k >= '1' && k <= '5') selectSlot(+k - 1);
        if (down && (k === 'w' || k === 'a' || k === 's' || k === 'd' || k === ' ')) {
            if (playing) e.preventDefault();
        }
    }
    function onWheel(e) {
        if (!playing) return;
        e.preventDefault();
        selectSlot((selected + (e.deltaY > 0 ? 1 : HOTBAR.length - 1)) % HOTBAR.length);
    }

    var strings = {};
    function setStatus(text, show) {
        els.status.textContent = text || '';
        els.status.hidden = !show;
    }

    function selectSlot(i) {
        selected = i;
        var slots = els.hotbar.children;
        for (var j = 0; j < slots.length; j++) slots[j].classList.toggle('active', j === i);
    }

    function buildHotbar(names) {
        els.hotbar.innerHTML = '';
        HOTBAR.forEach(function (t, i) {
            var slot = document.createElement('div');
            slot.className = 'mc-slot' + (i === 0 ? ' active' : '');
            slot.title = names[i] || '';
            var sw = document.createElement('span');
            sw.className = 'mc-swatch';
            sw.style.background = '#' + BLOCKS[t].toString(16).padStart(6, '0');
            var num = document.createElement('b');
            num.textContent = (i + 1);
            slot.appendChild(sw);
            slot.appendChild(num);
            slot.addEventListener('click', function () { selectSlot(i); });
            els.hotbar.appendChild(slot);
        });
    }

    function loadThree(urls) {
        return new Promise(function (resolve, reject) {
            if (window.THREE) return resolve();
            (function next(i) {
                if (i >= urls.length) return reject();
                var s = document.createElement('script');
                s.src = urls[i];
                s.onload = function () { window.THREE ? resolve() : next(i + 1); };
                s.onerror = function () { next(i + 1); };
                document.head.appendChild(s);
            })(0);
        });
    }

    function requestLock() { els.stage.requestPointerLock(); }

    function boot(cfg) {
        els.stage = document.getElementById(cfg.stageId);
        els.overlay = document.getElementById(cfg.overlayId);
        els.hotbar = document.getElementById(cfg.hotbarId);
        els.start = document.getElementById(cfg.startBtnId);
        els.status = document.getElementById(cfg.statusId);
        strings = cfg.strings;
        if (!els.stage) return;

        buildHotbar(cfg.blocks);
        document.addEventListener('contextmenu', function (e) {
            if (playing) e.preventDefault();
        });
        document.addEventListener('pointerlockchange', onLockChange);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('keydown', function (e) { onKey(e, true); });
        document.addEventListener('keyup', function (e) { onKey(e, false); });
        els.stage.addEventListener('wheel', onWheel, { passive: false });

        var ready = false;
        function enterOrResume() {
            if (ready) { requestLock(); return; }
            els.start.disabled = true;
            els.start.style.display = 'none';
            setStatus(strings.loading, true);
            loadThree(cfg.cdnUrls).then(function () {
                THREE = window.THREE;
                buildScene();
                ready = true;
                setStatus(strings.ready, true);
                els.overlay.classList.add('clickable');
            }).catch(function () {
                setStatus(strings.error, true);
                els.start.disabled = false;
                els.start.style.display = '';
            });
        }
        els.start.addEventListener('click', enterOrResume);
        els.overlay.addEventListener('click', function (e) {
            if (ready && e.target !== els.start) requestLock();
        });
    }

    window.MCGame = { boot: boot };
})();
