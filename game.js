const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const player = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    width: 30,
    height: 30,
    speed: 2,
    image: new Image(),
    dx: 0,
    dy: 0,
    lastDx: 0,  // Dernière direction horizontale
    lastDy: 0,  // Dernière direction verticale
    health: 100,
};

const bullets = [];
const monsters = [];
const bulletSpeed = 8;
const monsterSpeed = 1;
const damagePerHit = 10;
let gameOver = false;
let killCount = 0;
let boss = null;
let isBossAlive = false;

const bulletSound = new Audio("assets/sounds/bullet_sound.mp3");
const hitSound = new Audio("assets/sounds/hit_sound.mp3");

player.image.src = "assets/images/player_image.png";

const bulletImage = new Image();
bulletImage.src = "assets/images/bullet_image.png";

const monsterImage = new Image();
monsterImage.src = "assets/images/monster_image.png";

const bossImage = new Image();
bossImage.src = "assets/images/boss_image.png";

// ➡️ Vérification du Game Over
function checkGameOver() {
    if (player.health <= 0) {
        gameOver = true;
        // Enregistrer le score final dans le localStorage
        localStorage.setItem("finalScore", killCount);
        setTimeout(() => {
            window.location.href = "game-over.html";
        }, 500);
    }
}

function updatePlayerPosition() {
    player.x += player.dx;
    player.y += player.dy;

    // Limiter le joueur dans les bords de l'écran
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;

    // Mémoriser la dernière direction de déplacement
    if (player.dx !== 0 || player.dy !== 0) {
        player.lastDx = player.dx;
        player.lastDy = player.dy;
    }
}

function drawPlayer() {
    ctx.drawImage(player.image, player.x, player.y, player.width, player.height);
}

function drawMonsters() {
    monsters.forEach(monster => {
        ctx.drawImage(monsterImage, monster.x, monster.y, monster.width, monster.height);
    });
}

function updateMonsters() {
    monsters.forEach((monster, index) => {
        if (monster.x < player.x) monster.x += monsterSpeed;
        if (monster.x > player.x) monster.x -= monsterSpeed;
        if (monster.y < player.y) monster.y += monsterSpeed;
        if (monster.y > player.y) monster.y -= monsterSpeed;

        // Collision avec le joueur
        if (isCollision(player, monster)) {
            player.health -= damagePerHit;
            hitSound.play();
            monsters.splice(index, 1);
            checkGameOver();
        }
    });
}

function drawBullets() {
    bullets.forEach((bullet, index) => {
        ctx.drawImage(bulletImage, bullet.x, bullet.y, bullet.width, bullet.height);
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;

        // Supprimer les balles hors de l'écran
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(index, 1);
        }

        // Collision avec les monstres
        monsters.forEach((monster, monsterIndex) => {
            if (isCollision(bullet, monster)) {
                monsters.splice(monsterIndex, 1);
                bullets.splice(index, 1);
                killCount++;
                hitSound.play();
            }
        });

        // Collision avec le boss
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

function drawBoss() {
    if (isBossAlive) {
        ctx.drawImage(bossImage, boss.x, boss.y, boss.width, boss.height);
    }
}

function drawScore() {
    ctx.font = "20px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText("Score: " + killCount, 10, 30);
}

function drawHealth() {
    ctx.font = "20px Arial";
    ctx.fillStyle = "#f00";
    ctx.fillText("Health: " + player.health, 10, 60);
}

function isCollision(obj1, obj2) {
    return (
        obj1.x < obj2.x + obj2.width &&
        obj1.x + obj1.width > obj2.x &&
        obj1.y < obj2.y + obj2.height &&
        obj1.y + obj1.height > obj2.y
    );
}

// ➡️ Nouvelle fonction de tir dans la direction du mouvement du joueur
function fireBullet() {
    const bullet = {
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        width: 10,
        height: 10,
        dx: player.lastDx !== 0 ? Math.sign(player.lastDx) * bulletSpeed : 0,  // Utiliser la dernière direction horizontale
        dy: player.lastDy !== 0 ? Math.sign(player.lastDy) * bulletSpeed : 0   // Utiliser la dernière direction verticale
    };
    bullets.push(bullet);
    bulletSound.play();
}

function spawnMonsters() {
    setInterval(() => {
        if (!gameOver) {
            if (killCount % 25 === 0 && killCount > 0 && !isBossAlive) {
                spawnBoss();
            } else if (!isBossAlive) {
                const monster = {
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    width: 30,
                    height: 30
                };
                monsters.push(monster);
            }
        }
    }, 1000);
}

function spawnBoss() {
    boss = {
        x: canvas.width / 2 - 50,
        y: canvas.height / 2 - 50,
        width: 100,
        height: 100,
        health: 50
    };
    isBossAlive = true;
}

function keyDownHandler(e) {
    if (gameOver) return;
    if (e.key === "d" || e.key === "ArrowRight") player.dx = player.speed;
    if (e.key === "q" || e.key === "ArrowLeft") player.dx = -player.speed;
    if (e.key === "z" || e.key === "ArrowUp") player.dy = -player.speed;
    if (e.key === "s" || e.key === "ArrowDown") player.dy = player.speed;
    if (e.key === " ") {  // Tirer lorsque la touche espace est pressée
        fireBullet();
    }
}

function keyUpHandler(e) {
    if (["d", "ArrowRight", "q", "ArrowLeft"].includes(e.key)) player.dx = 0;
    if (["z", "ArrowUp", "s", "ArrowDown"].includes(e.key)) player.dy = 0;
}

function mouseClickHandler(e) {
    if (!gameOver) {
        fireBullet();
    }
}

function updateBoss() {
    if (isBossAlive && boss) {
        const attackRange = 50;  // Distance d'attaque du boss

        // Le boss se déplace vers le joueur
        if (boss.x < player.x) boss.x += monsterSpeed * 2;
        if (boss.x > player.x) boss.x -= monsterSpeed * 2;
        if (boss.y < player.y) boss.y += monsterSpeed * 2;
        if (boss.y > player.y) boss.y -= monsterSpeed * 2;

        // Vérifier si le boss est dans la portée d'attaque
        const distanceToPlayer = Math.sqrt(
            Math.pow(boss.x - player.x, 2) + Math.pow(boss.y - player.y, 2)
        );

        if (distanceToPlayer < attackRange) {
            player.health -= damagePerHit * 2;  // Boss fait le double des dégâts
            hitSound.play();
            checkGameOver();
        }
    }
}

function gameLoop() {
    if (!gameOver) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updatePlayerPosition();
        updateMonsters();
        updateBoss(); // Appel de la mise à jour du boss
        drawPlayer();
        drawBullets();
        drawMonsters();
        drawBoss();
        drawScore();
        drawHealth(); // ✅ Affichage de la santé
        requestAnimationFrame(gameLoop);
    }
}

document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);
canvas.addEventListener("click", mouseClickHandler);

spawnMonsters();
gameLoop();
