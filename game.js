// Récupération du canevas et du contexte 2D
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Connexion au serveur WebSocket
const socket = io();

// Traitement des données envoyées par l'Arduino
socket.on('arduino_data', function (data) {
    console.log("Données reçues de l'Arduino :", data);
    // Analyse des données (exemple : "Joystick 1: X=512, Y=256, L3=1 | Joystick 2: X=300, Y=400, R3=0")
    const parsedData = parseArduinoData(data.data);
    // Application des données aux joueurs
    applyArduinoControls(parsedData);
});

// Fonction pour analyser les données de l'Arduino
function parseArduinoData(data) {
    const result = {};
    const parts = data.split('|');
    parts.forEach(part => {
        const [key, values] = part.split(':');
        if (key.includes('Joystick')) {
            const joystick = key.trim().replace(':', '');
            result[joystick] = {};
            values.split(',').forEach(pair => {
                const [k, v] = pair.split('=');
                result[joystick][k.trim()] = parseInt(v.trim());
            });
        } else if (key.includes('Buttons')) {
            result['Buttons'] = values.split(',').map(button => parseInt(button.trim()));
        }
    });
    return result;
}

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
    canShoot: true
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
    canShoot: true
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
let isPaused = false; // Nouvelle variable pour gérer la pause
let gameInterval;

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

document.getElementById("pauseButton").addEventListener("click", togglePause);

function togglePause() {
    isPaused = !isPaused;

    // Si le jeu est en pause
    if (isPaused) {
        clearInterval(gameInterval); // Arrêter les mises à jour du jeu
        document.getElementById("pauseButton").textContent = "Reprendre"; // Changer le texte du bouton
    } else {
        gameInterval = setInterval(gameLoop, 1000 / 60); // Reprendre les mises à jour du jeu
        document.getElementById("pauseButton").textContent = "Pause"; // Restaurer le texte du bouton
    }
}

function updateSoundVolumes() {
    const bulletVolume = localStorage.getItem("bulletVolume");
    const hitVolume = localStorage.getItem("hitVolume");

    if (bulletVolume) {
        bulletSound.volume = parseFloat(bulletVolume);
    }
    if (hitVolume) {
        hitSound.volume = parseFloat(hitVolume);
    }
}

function checkGameOver() {
    console.log(`Player1 dead: ${player1.dead}, Player2 dead: ${player2.dead}`);
    if (player1.dead && player2.dead && !gameOver) {
        console.log("Game over triggered");
        gameOver = true;
        localStorage.setItem("finalScore", killCount);
        setTimeout(() => {
            window.location.href = "game-over.html";
        }, 500);
    }
}

function startBossDamageInterval() {
    setInterval(() => {
        if (isBossAlive) {
            if (!player1.dead && player1.health > 0) {
                player1.health -= 10;
                if (player1.health <= 0) {
                    player1.dead = true;
                }
            }
            if (!player2.dead && player2.health > 0) {
                player2.health -= 20;
                if (player2.health <= 0) {
                    player2.dead = true;
                }
            }
            checkGameOver();
        }
    }, 5000);
}

function updatePlayerPosition(player) {
    if (player.health <= 0) {
        player.health = 0;
        player.dead = true;
    }

    if (player.dead) return;

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
    if (player.health > 0) {
        ctx.drawImage(player.image, player.x, player.y, player.width, player.height);
    }
}

function drawMonsters() {
    monsters.forEach(monster => {
        ctx.drawImage(monsterImage, monster.x, monster.y, monster.width, monster.height);
    });

    if (isBossAlive && boss) {
        ctx.drawImage(bossImage, boss.x, boss.y, boss.width, boss.height);
    }
}

function updateMonsters() {
    monsters.forEach((monster, index) => {
        let targetPlayer = null;
        const distanceToPlayer1 = !player1.dead ? Math.sqrt(Math.pow(monster.x - player1.x, 2) + Math.pow(monster.y - player1.y, 2)) : Infinity;
        const distanceToPlayer2 = !player2.dead ? Math.sqrt(Math.pow(monster.x - player2.x, 2) + Math.pow(monster.y - player2.y, 2)) : Infinity;

        if (distanceToPlayer1 < distanceToPlayer2) {
            targetPlayer = player1;
        } else if (distanceToPlayer2 < distanceToPlayer1) {
            targetPlayer = player2;
        }

        if (targetPlayer) {
            if (monster.x < targetPlayer.x) monster.x += monsterSpeed;
            if (monster.x > targetPlayer.x) monster.x -= monsterSpeed;
            if (monster.y < targetPlayer.y) monster.y += monsterSpeed;
            if (monster.y > targetPlayer.y) monster.y -= monsterSpeed;

            if (isCollision(monster, targetPlayer)) {
                targetPlayer.health -= damagePerHit;
                hitSound.play();
                monsters.splice(index, 1);
                checkGameOver();
                updateSoundVolumes();
            }
        }
    });

    if (isBossAlive && boss) {
        let targetPlayer = null;
        const distanceToPlayer1 = !player1.dead ? Math.sqrt(Math.pow(boss.x - player1.x, 2) + Math.pow(boss.y - player1.y, 2)) : Infinity;
        const distanceToPlayer2 = !player2.dead ? Math.sqrt(Math.pow(boss.x - player2.x, 2) + Math.pow(boss.y - player2.y, 2)) : Infinity;

        if (distanceToPlayer1 < distanceToPlayer2) {
            targetPlayer = player1;
        } else if (distanceToPlayer2 < distanceToPlayer1) {
            targetPlayer = player2;
        }

        if (targetPlayer) {
            if (boss.x < targetPlayer.x) boss.x += monsterSpeed;
            if (boss.x > targetPlayer.x) boss.x -= monsterSpeed;
            if (boss.y < targetPlayer.y) boss.y += monsterSpeed;
            if (boss.y > targetPlayer.y) boss.y -= monsterSpeed;
            // Cooldown du boss
            const now = Date.now();
            if (isCollision(boss, targetPlayer) && now - (boss.lastDamageTime || 0) > 5000) {
                targetPlayer.health -= damagePerHit;
                boss.lastDamageTime = now;
                hitSound.play();
            }
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
    if (player.dead || !player.canShoot) return;

    let dx = 0;
    let dy = 0;

    // Tir en fonction de la dernière direction
    if (player.lastDx !== 0 && player.lastDy === 0) {
        // Mouvement horizontal uniquement
        dx = Math.sign(player.lastDx) * bulletSpeed;
    } else if (player.lastDy !== 0 && player.lastDx === 0) {
        // Mouvement vertical uniquement
        dy = Math.sign(player.lastDy) * bulletSpeed;
    } else if (player.lastDx !== 0 && player.lastDy !== 0) {
        // Mouvement diagonal
        dx = Math.sign(player.lastDx) * bulletSpeed;
        dy = Math.sign(player.lastDy) * bulletSpeed;
    }

    const bullet = {
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        width: 10,
        height: 10,
        dx: dx,
        dy: dy
    };

    bullets.push(bullet);
    bulletSound.play();

    // Cooldown pour éviter le spam de tirs
    player.canShoot = false;
    setTimeout(() => {
        player.canShoot = true;
    }, 100); // Cooldown de 100ms

    bulletSound.play();
    updateSoundVolumes();
}

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
        player.canShoot = true;
    }, salvoCooldown);
}

function spawnMonsters() {
    setInterval(() => {
        if (!gameOver) {
            if (killCount >= 10 && !isBossAlive) {
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
        x: canvas.width / 2,
        y: 50,
        width: 80,
        height: 80,
        health: 100
    };
    isBossAlive = true;
    startBossDamageInterval(); // Lancement des dégâts toutes les 5 secondes
    updateSoundVolumes();
}

// Fonction pour appliquer les données à la commande des joueurs
function applyArduinoControls(data) {
    const { 'Joystick 1': joystick1, 'Joystick 2': joystick2, Buttons: buttons } = data;
    console.log("Joystick 1 :", joystick1);
    console.log("Joystick 2 :", joystick2);
    console.log("Boutons :", buttons);
    // Commande du joueur 1
    player1.dx = mapJoystickToSpeed(joystick1.X);
    player1.dy = mapJoystickToSpeed(joystick1.Y);
    if (joystick1.L3 === 0) fireBullet(player1);
    // Commande du joueur 2
    player2.dx = mapJoystickToSpeed(joystick2.X);
    player2.dy = mapJoystickToSpeed(joystick2.Y);
    if (joystick2.R3 === 0) fireBullet(player2);
    // Commande des boutons
    if (buttons[0] === 0) fireSalvo(player1);
    if (buttons[1] === 0) fireSalvo(player2);
}

// Fonction pour transformer les valeurs du joystick en vitesse
function mapJoystickToSpeed(value) {
    const center = 512; // Valeur centrale du joystick
    const deadZone = 50; // Zone sans réactivité
    const maxSpeed = 5; // Vitesse maximale
    if (Math.abs(value - center) < deadZone) {
        return 0;
    }
    return ((value - center) / (1023 - center)) * maxSpeed;
}

document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);

function gameLoop() {
    if (isPaused) return; // Si le jeu est en pause, ne rien faire

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    updatePlayerPosition(player1);
    updatePlayerPosition(player2);
    updateMonsters();
    drawPlayer(player1);
    drawPlayer(player2);
    drawMonsters();
    drawBullets();
    drawScore();
    drawHealth();
    updateSoundVolumes();

    // Vérifie l'état du jeu à chaque frame
    checkGameOver();

    if (!gameOver) {
        requestAnimationFrame(gameLoop);
    }
}

gameLoop();
spawnMonsters();

// Fonction pour appeler l'API en GET (récupérer les données)
async function getData() {
    try {
        let response = await fetch('http://127.0.0.1:5000/api/data');
        if (!response.ok) {
            throw new Error('Erreur de réseau');
        }
        let data = await response.json();
        console.log(data);  // Affiche les données retournées par l'API
    } catch (error) {
        console.error('Erreur avec l\'API :', error);
    }
}

// Fonction pour envoyer des données via POST (par exemple pour soumettre des informations ou des résultats)
async function postData(data) {
    try {
        let response = await fetch('http://127.0.0.1:5000/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error('Erreur de réseau');
        }
        let result = await response.json();
        console.log(result);  // Affiche le résultat de l'API
    } catch (error) {
        console.error('Erreur avec l\'envoi des données :', error);
    }
}