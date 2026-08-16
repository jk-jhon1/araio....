const player = document.getElementById('player');
const mapContainer = document.getElementById('map-container');
const log = document.querySelector('#action-log p');

// Posição inicial do jogador
let playerX = 500;
let playerY = 300;
const speed = 10;

// Centraliza a câmera no jogador
function updateCamera() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Calcula a posição do mapa para que o jogador fique no centro da tela
    const mapX = (windowWidth / 2) - playerX;
    const mapY = (windowHeight / 2) - playerY;
    
    mapContainer.style.left = `${mapX}px`;
    mapContainer.style.top = `${mapY}px`;
}

// Atualiza a posição da bolinha vermelha (jogador) no mapa
function updatePlayerPosition() {
    player.style.left = `${playerX}px`;
    player.style.top = `${playerY}px`;
    updateCamera();
}

// Controles de teclado
window.addEventListener('keydown', (e) => {
    switch(e.key.toLowerCase()) {
        case 'w':
            playerY -= speed;
            log.innerText = "Você caminha para o Norte.";
            break;
        case 's':
            playerY += speed;
            log.innerText = "Você caminha para o Sul.";
            break;
        case 'a':
            playerX -= speed;
            log.innerText = "Você caminha para o Oeste.";
            break;
        case 'd':
            playerX += speed;
            log.innerText = "Você caminha para o Leste.";
            break;
    }
    updatePlayerPosition();
});

// Inicialização
updatePlayerPosition();
