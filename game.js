const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const player1 = {
    x: canvas.width / 4,
    y: canvas.height - 50,
    width: 30,
    height: 30,
    speed: 2,
    image: new Image(),
    dx: 0,
    dy: 0,
    lastDx: 0,  
    lastDy: 0,  
    health: 100,
    dead: false,
    lastSalvoTime: 0,
    canShoot: true // Ajout d'un indicateur pour vérifier si le joueur peut tirer
};

const player2 = {
    x: (canvas.width / 4) * 3,
    y: canvas.height - 50,
    width: 30,
    height: 30,
    speed: 2,
    image: new Image(),
    dx: 0,
    dy: 0,
    lastDx: 0,  
    lastDy: 0,  
    health: 100,
    dead: false,
    lastSalvoTime: 0,
    canShoot: true // Idem pour le joueur 2
};

const salvoCooldown = 3000;
const bullets = [];
const monsters = [];
const bulletSpeed = 8;
const monsterSpeed = 1;
const damagePerHit = 20;
let gameOver = false;
let killCount = 0;
let isBossAlive = false;
let boss = null;

const bulletSound = new Audio("assets/sounds/bullet_sound.mp3");
const hitSound = new Audio("assets/sounds/hit_sound.mp3");

player1.image.src = "assets/images/player_image.png";
player2.image.src = "assets/images/player_image.png";

const bulletImage = new Image();
bulletImage.src = "assets/images/bullet_image.png";

const monsterImage = new Image();
monsterImage.src = "assets/images/monster_image.png";

const bossImage = new Image();
bossImage.src = "assets/images/boss_image.png";

// ➡️ Vérification du Game Over
function checkGameOver() {
    if (player1.health <= 0 && player2.health <= 0) {
        gameOver = true;
        localStorage.setItem("finalScore", killCount);
        setTimeout(() => {
            window.location.href = "game-over.html";
        }, 500);
    }
}

function updatePlayerPosition(player) {
    player.x += player.dx;
    player.y += player.dy;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;

    if (player.dx !== 0 || player.dy !== 0) {
        player.lastDx = player.dx;
        player.lastDy = player.dy;
    }
}

function drawPlayer(player) {
    ctx.drawImage(player.image, player.x, player.y, player.width, player.height);
}

function drawMonsters() {
    monsters.forEach(monster => {
        ctx.drawImage(monsterImage, monster.x, monster.y, monster.width, monster.height);
    });

    // Si le boss existe et est vivant, dessine-le
    if (isBossAlive && boss) {
        ctx.drawImage(bossImage, boss.x, boss.y, boss.width, boss.height);
    }
}

function updateMonsters() {
    monsters.forEach((monster, index) => {
        // Calculer les distances entre le monstre et les deux joueurs
        const distanceToPlayer1 = Math.sqrt(Math.pow(monster.x - player1.x, 2) + Math.pow(monster.y - player1.y, 2));
        const distanceToPlayer2 = Math.sqrt(Math.pow(monster.x - player2.x, 2) + Math.pow(monster.y - player2.y, 2));

        // Déterminer quel joueur est le plus proche
        let targetPlayer = player1;
        if (distanceToPlayer2 < distanceToPlayer1) {
            targetPlayer = player2;
        }

        // Déplacer le monstre vers le joueur le plus proche
        if (monster.x < targetPlayer.x) monster.x += monsterSpeed;
        if (monster.x > targetPlayer.x) monster.x -= monsterSpeed;
        if (monster.y < targetPlayer.y) monster.y += monsterSpeed;
        if (monster.y > targetPlayer.y) monster.y -= monsterSpeed;

        // Vérifier les collisions avec les joueurs
        if (isCollision(player1, monster) || isCollision(player2, monster)) {
            if (isCollision(player1, monster)) player1.health -= damagePerHit;
            if (isCollision(player2, monster)) player2.health -= damagePerHit;
            hitSound.play();
            monsters.splice(index, 1);
            checkGameOver();
        }
    });

    // Boss : même logique d'aggro que pour les monstres
    if (isBossAlive && boss) {
        const distanceToPlayer1 = Math.sqrt(Math.pow(boss.x - player1.x, 2) + Math.pow(boss.y - player1.y, 2));
        const distanceToPlayer2 = Math.sqrt(Math.pow(boss.x - player2.x, 2) + Math.pow(boss.y - player2.y, 2));

        let targetPlayer = player1;
        if (distanceToPlayer2 < distanceToPlayer1) {
            targetPlayer = player2;
        }

        // Déplacer le boss vers le joueur le plus proche
        if (boss.x < targetPlayer.x) boss.x += monsterSpeed;
        if (boss.x > targetPlayer.x) boss.x -= monsterSpeed;
        if (boss.y < targetPlayer.y) boss.y += monsterSpeed;
        if (boss.y > targetPlayer.y) boss.y -= monsterSpeed;

        // Vérifier les collisions avec les joueurs
        if (isCollision(player1, boss)) {
            player1.health -= damagePerHit;
            hitSound.play();
        }
        if (isCollision(player2, boss)) {
            player2.health -= damagePerHit;
            hitSound.play();
        }
    }
}

function drawBullets() {
    bullets.forEach((bullet, index) => {
        ctx.drawImage(bulletImage, bullet.x, bullet.y, bullet.width, bullet.height);
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;

        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(index, 1);
        }

        monsters.forEach((monster, monsterIndex) => {
            if (isCollision(bullet, monster)) {
                monsters.splice(monsterIndex, 1);
                bullets.splice(index, 1);
                killCount++;
                hitSound.play();
            }
        });

        if (isBossAlive && boss && isCollision(bullet, boss)) {
            boss.health -= 1;
            bullets.splice(index, 1);
            if (boss.health <= 0) {
                isBossAlive = false;
                killCount++;
            }
        }
    });
}

function drawScore() {
    ctx.font = "20px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText("Score: " + killCount, 10, 30);
}

function drawHealth() {
    ctx.font = "20px Arial";
    ctx.fillStyle = "#f00";
    ctx.fillText("Player 1 Health: " + player1.health, 10, 60);
    ctx.fillText("Player 2 Health: " + player2.health, 10, 90);
}

function isCollision(obj1, obj2) {
    return (
        obj1.x < obj2.x + obj2.width &&
        obj1.x + obj1.width > obj2.x &&
        obj1.y < obj2.y + obj2.height &&
        obj1.y + obj1.height > obj2.y
    );
}

function fireBullet(player) {
    const bullet = {
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        width: 10,
        height: 10,
        dx: player.lastDx !== 0 ? Math.sign(player.lastDx) * bulletSpeed : 0,
        dy: player.lastDy !== 0 ? Math.sign(player.lastDy) * bulletSpeed : 0
    };
    bullets.push(bullet);
    bulletSound.play();
}

// Fonction pour tirer une salve avec cooldown
function fireSalvo(player) {
    const currentTime = Date.now();
    if (currentTime - player.lastSalvoTime < salvoCooldown || !player.canShoot) return;

    player.lastSalvoTime = currentTime;
    player.canShoot = false;

    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const bullet = {
                x: player.x + player.width / 2,
                y: player.y + player.height / 2,
                width: 10,
                height: 10,
                dx: player.lastDx !== 0 ? Math.sign(player.lastDx) * bulletSpeed : 0,
                dy: player.lastDy !== 0 ? Math.sign(player.lastDy) * bulletSpeed : 0
            };
            bullets.push(bullet);
            bulletSound.play();
        }, i * 100);
    }

    setTimeout(() => {
        player.canShoot = true;  // Permet de tirer à nouveau après la salve
    }, salvoCooldown);
}

function spawnMonsters() {
    setInterval(() => {
        if (!gameOver) {
            if (killCount >= 10 && !isBossAlive) {
                spawnBoss();
            } else if (!isBossAlive) {
                // Vérifie que les monstres sont bien ajoutés
                const monster = {
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    width: 30,
                    height: 30
                };
                monsters.push(monster);
            }
        }
    }, 1000); // Monstres spawn toutes les 1 seconde
}

function spawnBoss() {
    if (!isBossAlive) { // Vérifie que le boss n'est pas déjà spawné
        boss = {
            x: canvas.width / 2 - 50,
            y: canvas.height / 2 - 50,
            width: 100,
            height: 100,
            health: 50
        };
        isBossAlive = true;
    }
}

function keyDownHandler(e) {
    if (gameOver) return;

    if (e.key === "d") player1.dx = player1.speed;
    if (e.key === "q") player1.dx = -player1.speed;
    if (e.key === "z") player1.dy = -player1.speed;
    if (e.key === "s") player1.dy = player1.speed;

    if (e.key === "ArrowRight") player2.dx = player2.speed;
    if (e.key === "ArrowLeft") player2.dx = -player2.speed;
    if (e.key === "ArrowUp") player2.dy = -player2.speed;
    if (e.key === "ArrowDown") player2.dy = player2.speed;

    if (e.key === "r") fireBullet(player2);  // Tir sans cooldown pour le joueur 2
    if (e.key === "t") fireBullet(player1);  // Tir sans cooldown pour le joueur 1

    if (e.key === "f") fireSalvo(player2); // Tir salve avec cooldown pour le joueur 2
    if (e.key === "g") fireSalvo(player1); // Tir salve avec cooldown pour le joueur 1
}

function keyUpHandler(e) {
    if (["d", "q"].includes(e.key)) player1.dx = 0;
    if (["z", "s"].includes(e.key)) player1.dy = 0;

    if (["ArrowRight", "ArrowLeft"].includes(e.key)) player2.dx = 0;
    if (["ArrowUp", "ArrowDown"].includes(e.key)) player2.dy = 0;
}

document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    updatePlayerPosition(player1);
    updatePlayerPosition(player2);

    drawPlayer(player1);
    drawPlayer(player2);
    drawBullets();
    drawMonsters();
    drawScore();
    drawHealth();
    updateMonsters();

    if (!gameOver) requestAnimationFrame(gameLoop);
}

gameLoop();
spawnMonsters();
