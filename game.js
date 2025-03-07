// game.js

// Récupération du canvas et du contexte de dessin
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Variables de jeu
const player = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    width: 30,
    height: 30,
    speed: 2, // Ralentir la vitesse du joueur
    image: new Image(), // Image du joueur
    dx: 0, // Déplacement horizontal
    dy: 0, // Déplacement vertical
    health: 100, // Points de vie du joueur
};

const bullets = [];
const monsters = [];
const bulletSpeed = 8; // Augmenter la vitesse du projectile
const monsterSpeed = 1; // Ralentir les monstres
const damagePerHit = 10; // Dégâts infligés par les monstres
let gameOver = false; // Variable pour savoir si le jeu est terminé
let killCount = 0; // Compteur de kills
let boss = null; // Variable pour le boss
let isBossAlive = false; // Variable pour savoir si le boss est en vie

// Sons
const bulletSound = new Audio("assets/sounds/bullet_sound.mp3");
const hitSound = new Audio("assets/sounds/hit_sound.mp3");

// Charger l'image du joueur
player.image.src = "assets/images/player_image.png";

// Image pour les balles et les monstres
const bulletImage = new Image();
bulletImage.src = "assets/images/bullet_image.png";

const monsterImage = new Image();
monsterImage.src = "assets/images/monster_image.png";

// Image du boss
const bossImage = new Image();
bossImage.src = "assets/images/boss_image.png";

// Fonction pour dessiner le joueur
function drawPlayer() {
    ctx.drawImage(player.image, player.x, player.y, player.width, player.height);
}

// Fonction pour dessiner les balles
function drawBullets() {
    bullets.forEach((bullet, index) => {
        ctx.drawImage(bulletImage, bullet.x, bullet.y, bullet.width, bullet.height);
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;

        // Supprimer les balles qui sont sorties de l'écran
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(index, 1);
        }

        // Vérifier la collision avec les monstres
        monsters.forEach((monster, monsterIndex) => {
            if (isCollision(bullet, monster)) {
                // Supprimer le monstre et la balle
                monsters.splice(monsterIndex, 1);
                bullets.splice(index, 1);
                killCount++; // Incrémenter le compteur de kills
                hitSound.play(); // Jouer le son de collision
            }
        });

        // Vérifier la collision avec le boss
        if (isBossAlive && boss && isCollision(bullet, boss)) {
            boss.health -= 1; // Réduire la santé du boss à chaque tir
            bullets.splice(index, 1);
            if (boss.health <= 0) {
                isBossAlive = false; // Le boss meurt
                killCount++; // Augmenter le compteur de kills une dernière fois
            }
        }
    });
}

// Fonction pour dessiner les monstres
function drawMonsters() {
    monsters.forEach(monster => {
        ctx.drawImage(monsterImage, monster.x, monster.y, monster.width, monster.height);
    });
}

// Fonction pour dessiner le boss
function drawBoss() {
    if (isBossAlive && boss) {
        ctx.drawImage(bossImage, boss.x, boss.y, boss.width, boss.height);
    }
}

// Fonction pour mettre à jour la position du joueur
function updatePlayerPosition() {
    player.x += player.dx;
    player.y += player.dy;

    // Empêcher le joueur de sortir de l'écran
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
}

// Fonction pour mettre à jour la position des monstres
function updateMonsters() {
    monsters.forEach(monster => {
        // Déplacement des monstres (vers le joueur)
        if (monster.x < player.x) monster.x += monsterSpeed;
        if (monster.x > player.x) monster.x -= monsterSpeed;
        if (monster.y < player.y) monster.y += monsterSpeed;
        if (monster.y > player.y) monster.y -= monsterSpeed;

        // Vérifier la collision avec le joueur
        if (isCollision(player, monster)) {
            player.health -= damagePerHit;  // Le joueur perd des points de vie
            const index = monsters.indexOf(monster);
            if (index > -1) {
                monsters.splice(index, 1); // Supprimer le monstre seulement quand il touche le joueur
                hitSound.play(); // Jouer le son lorsque le joueur est touché
            }
        }
    });
}

// Fonction pour vérifier la collision entre deux objets
function isCollision(obj1, obj2) {
    return (
        obj1.x < obj2.x + obj2.width &&
        obj1.x + obj1.width > obj2.x &&
        obj1.y < obj2.y + obj2.height &&
        obj1.y + obj1.height > obj2.y
    );
}

// Fonction pour gérer les entrées du clavier
function keyDownHandler(e) {
    if (gameOver) return; // Si le jeu est terminé, on ignore les touches
    if (e.key === "d" || e.key === "ArrowRight") { // Déplacement à droite
        player.dx = player.speed;
    }
    if (e.key === "q" || e.key === "ArrowLeft") { // Déplacement à gauche
        player.dx = -player.speed;
    }
    if (e.key === "z" || e.key === "ArrowUp") { // Déplacement vers le haut
        player.dy = -player.speed;
    }
    if (e.key === "s" || e.key === "ArrowDown") { // Déplacement vers le bas
        player.dy = player.speed;
    }
}

// Fonction pour gérer le clic gauche de la souris
function mouseClickHandler(e) {
    if (gameOver) return; // Si le jeu est terminé, on ignore les clics
    fireBullet(); // Tirer une balle lorsqu'on clique
}

// Fonction pour tirer une balle
function fireBullet() {
    const bullet = {
        x: player.x + player.width / 2 - 5, // Position de départ de la balle
        y: player.y,
        width: 10,
        height: 20,
        dx: 0, // Déplacement horizontal
        dy: 0, // Déplacement vertical
    };

    // Si le joueur se déplace, tirer en fonction de la direction du déplacement
    if (player.dy < 0) { // Si le joueur se déplace vers le haut
        bullet.dy = -bulletSpeed;
    } else if (player.dy > 0) { // Si le joueur se déplace vers le bas
        bullet.dy = bulletSpeed;
    } else if (player.dx > 0) { // Si le joueur se déplace vers la droite
        bullet.dx = bulletSpeed;
    } else if (player.dx < 0) { // Si le joueur se déplace vers la gauche
        bullet.dx = -bulletSpeed;
    } else { // Si le joueur n'est pas en mouvement (tir devant lui)
        bullet.dy = -bulletSpeed; // Par défaut, tirer vers le haut (devant)
    }

    bullets.push(bullet);
    bulletSound.play(); // Jouer le son lorsque la balle est tirée
}

// Fonction pour ajouter des monstres autour du joueur
function spawnMonsters() {
    // Ajouter des monstres à intervalle régulier
    setInterval(() => {
        if (!gameOver) {
            if (killCount % 25 === 0 && killCount > 0 && !isBossAlive) {
                // Si le nombre de kills atteint 25, spawn le boss
                spawnBoss();
            } else if (!isBossAlive) {
                const monster = {
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    width: 30,
                    height: 30,
                };
                monsters.push(monster);
            }
        }
    }, 1000); // Spawn un monstre toutes les 1 seconde
}

// Fonction pour spawn le boss
function spawnBoss() {
    boss = {
        x: canvas.width / 2 - 50, // Position initiale du boss
        y: canvas.height / 2 - 50,
        width: 100,
        height: 100,
        health: 50, // Le boss a 50 points de vie
    };
    isBossAlive = true;
    monsters.length = 0; // Effacer les petits monstres
}

// Fonction pour dessiner tout le jeu
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Effacer l'écran

    // Si le jeu est terminé, afficher Game Over et le bouton
    if (gameOver) {
        ctx.fillStyle = "black";
        ctx.font = "50px Arial";
        ctx.fillText("Game Over", canvas.width / 2 - 150, canvas.height / 2);
        drawRestartButton();
        return;
    }

    drawPlayer();
    drawBullets();
    drawMonsters();
    drawBoss();
    updatePlayerPosition();
    updateMonsters();

    // Affichage de la santé du joueur
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText("Santé: " + player.health, 10, 20);

    // Affichage du compteur de kills
    ctx.fillText("Kills: " + killCount, 10, 40);

    if (player.health <= 0) {
        gameOver = true;
    }

    requestAnimationFrame(drawGame);
}

// Fonction pour dessiner le bouton de redémarrage
function drawRestartButton() {
    const button = document.createElement("button");
    button.textContent = "Rejouer";
    button.style.position = "absolute";
    button.style.top = "50%";
    button.style.left = "50%";
    button.style.transform = "translate(-50%, -50%)";
    button.style.fontSize = "20px";
    button.id = "restartButton"; // Ajouter un identifiant unique
    button.onclick = restartGame;
    document.body.appendChild(button);
}

// Fonction pour redémarrer le jeu
function restartGame() {
    document.getElementById("restartButton").remove(); // Supprimer le bouton de redémarrage
    gameOver = false;
    player.health = 100; // Réinitialiser la santé
    killCount = 0; // Réinitialiser le compteur de kills
    monsters.length = 0; // Réinitialiser les monstres
    spawnMonsters(); // Recréer les monstres
    drawGame(); // Redessiner le jeu
}

// Événements du clavier et de la souris
window.addEventListener("keydown", keyDownHandler);
window.addEventListener("keyup", () => { player.dx = 0; player.dy = 0; });
window.addEventListener("click", mouseClickHandler);

// Démarrer le jeu
spawnMonsters();
drawGame();
