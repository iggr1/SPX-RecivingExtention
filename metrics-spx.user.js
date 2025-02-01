(function() {
    'use strict';

    // Função para carregar scripts externos
    function loadScript(src, callback) {
        const script = document.createElement('script');
        script.src = src;
        script.onload = callback;
        document.head.appendChild(script);
    }

    // Inicializa após as bibliotecas serem carregadas
    function initialize() {
        let lastValue = 0; // Último valor do contador
        let timestamps = JSON.parse(localStorage.getItem('timestamps') || '[]'); // Carrega timestamps salvos
        let hourlyCount = parseInt(localStorage.getItem('hourlyCount') || '0', 10); // Contador da última hora
        let lastHourUpdate = new Date().getHours(); // Última hora atualizada
        let gaugeSpeed = null;
        let gaugeHourly = null;
        let metaElement = null;
        let username = '';
        let decaySpeedPower = 50;
        let META = 1450;
        let globalLink = 'https://litte.com.br';

        function saveState() {
            localStorage.setItem('timestamps', JSON.stringify(timestamps));
            localStorage.setItem('hourlyCount', hourlyCount);
        }

        function setupGauge() {
            const element = document.querySelector('.separate-card.receive-task-form');
            if (!element) {
                console.error('Elemento .separate-card.receive-task-form não encontrado.');
                return;
            }

            element.style.display = 'flex';

            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexDirection = 'row';
            container.style.width = '100%';
            container.style.gap = '20px';

            // Contêiner do placar
            const placarContainer = document.createElement('div');
            placarContainer.id = 'ranking-container';
            placarContainer.style.width = '30%';
            placarContainer.style.height = 'auto';
            placarContainer.style.overflow = 'auto';
            placarContainer.style.border = '1px solid #ccc';
            placarContainer.style.borderRadius = '10px';
            placarContainer.style.padding = '10px';
            placarContainer.style.marginLeft = '20px';
            placarContainer.style.display = 'flex';
            placarContainer.style.flexDirection = 'column';
            placarContainer.style.alignItems = 'center';

            // Contêiner para os gauges e meta
            const gaugesContainer = document.createElement('div');
            gaugesContainer.style.display = 'flex';
            gaugesContainer.style.flexDirection = 'column';
            gaugesContainer.style.width = '70%';

            // Contêiner para os gauges
            const gaugesRow = document.createElement('div');
            gaugesRow.style.display = 'flex';
            gaugesRow.style.flexDirection = 'row';
            gaugesRow.style.gap = '20px';

            const speedGaugeContainer = document.createElement('div');
            speedGaugeContainer.id = 'gauge-speed-container';
            speedGaugeContainer.style.width = '50%';
            speedGaugeContainer.style.height = '100px';

            const hourlyGaugeContainer = document.createElement('div');
            hourlyGaugeContainer.id = 'gauge-hourly-container';
            hourlyGaugeContainer.style.width = '50%';
            hourlyGaugeContainer.style.height = '100px';

            gaugesRow.appendChild(speedGaugeContainer);
            gaugesRow.appendChild(hourlyGaugeContainer);

            // Elemento para a mensagem de meta
            metaElement = document.createElement('div');
            metaElement.id = 'meta-message';
            metaElement.style.textAlign = 'center';
            metaElement.style.marginTop = '10px';
            metaElement.style.fontSize = '18px';

            gaugesContainer.appendChild(gaugesRow);
            gaugesContainer.appendChild(metaElement);

            container.appendChild(placarContainer);
            container.appendChild(gaugesContainer);
            element.appendChild(container);

            gaugeSpeed = new JustGage({
                id: 'gauge-speed-container',
                value: 0,
                min: 0,
                max: 45,
                title: "Pacotes por Minuto",
                label: "pacotes/min",
                gaugeColor: "#e6e6e6",
                pointer: true,
                pointerOptions: {
                    toplength: -30,
                    bottomlength: 10,
                    bottomwidth: 5,
                    color: '#000'
                },
                customSectors: {
                    percents: false,
                    ranges: [
                        { color: "#ff0000", lo: 0, hi: 10 },
                        { color: "#ffe800", lo: 10, hi: 23 },
                        { color: "#00ff0e", lo: 23, hi: 35 },
                        { color: "#a600ff", lo: 35, hi: 45 }
                    ]
                }
            });

            gaugeHourly = new JustGage({
                id: 'gauge-hourly-container',
                value: hourlyCount,
                min: 0,
                max: META,
                title: "Meta à Alcançar",
                label: "pacotes",
                gaugeColor: "#e6e6e6",
                pointer: true,
                pointerOptions: {
                    toplength: -30,
                    bottomlength: 10,
                    bottomwidth: 5,
                    color: '#000'
                },
                customSectors: {
                    percents: false,
                    ranges: [
                        { color: "#FFFFCC", lo: 0, hi: 500 },
                        { color: "#CCFFCC", lo: 500, hi: 1000 },
                        { color: "#99CCCC", lo: 1000, hi: 1300 },
                        { color: "#6699FF", lo: 1300, hi: META }
                    ]
                }
            });

            monitorPackageCount();
            updateRanking();
            setInterval(updateRanking, 5000); // Atualiza o ranking a cada 5 segundos
            console.log('Gauges configurados e monitoramento iniciado!');
        }

        async function fetchRankingNamesAndValues() {
            try {
                const response = await fetch(`${globalLink}/api/ranking-names`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                // Verifica se a resposta está OK
                if (!response.ok) {
                    console.error(`Erro ao buscar ranking: ${response.status} ${response.statusText}`);
                    return [];
                }

                const data = await response.json();

                // Verifica se a resposta é um array de objetos com as propriedades esperadas
                if (Array.isArray(data) && data.every(item => item.name && typeof item.value === "number")) {
                    return data;
                } else {
                    console.error('Resposta inválida da API: Array esperado com propriedades `name` e `value`.');
                    return [];
                }
            } catch (error) {
                console.error('Erro ao buscar ranking:', error);
                return [];
            }
        }

        async function updateRanking() {
            const rankingContainer = document.getElementById('ranking-container');
            if (!rankingContainer) return;

            const rankingData = await fetchRankingNamesAndValues();
            console.log("rankingData:", rankingData);
            rankingContainer.innerHTML = ''; // Limpa o conteúdo anterior

            rankingData.forEach((item, index) => {
                const rankItem = document.createElement('div');

                // Adiciona o troféu ao primeiro nome
                if (index === 0) {
                    rankItem.innerHTML = `
                         <span style="color: gold; font-size: 20px; margin-right: 0;">🏆</span>
                         <strong>${item.name}</strong> - ${item.value}`;
                } else {
                    rankItem.innerHTML = `
                         <span>${index + 1}.</span>
                         <strong>${item.name}</strong> - ${item.value}`;
                }

                // Estiliza o texto do placar
                rankItem.style.marginBottom = '5px';
                rankItem.style.fontSize = '16px';
                rankItem.style.fontFamily = 'Arial, sans-serif';
                rankItem.style.color = index === 0 ? 'gold' : '#333';

                rankingContainer.appendChild(rankItem);
            });

            console.log(`[LOG] Ranking atualizado: ${JSON.stringify(rankingData)}`);
        }

        function calculateGauge() {
            const currentTimestamp = Date.now();

            // Remove timestamps fora do intervalo de 60 segundos
            timestamps = timestamps.filter(ts => currentTimestamp - ts <= 60000);

            // Calcula a taxa de pacotes por minuto
            const packagesPerMinute = timestamps.length;

            // Atualiza o gauge de velocidade
            gaugeSpeed.refresh(Math.min(packagesPerMinute, 45));
            console.log(`[LOG] Gauge de Velocidade atualizado para: ${packagesPerMinute}`);

            // Calcula se a meta será atingida
            calculateMetaProjection(packagesPerMinute);

            // Atualiza o valor atual para uso na decadência
            currentSpeed = packagesPerMinute;
        }

        function applySpeedDecay() {
            if (currentSpeed > 0) {
                currentSpeed -= 1; // Reduz 1 pacote por minuto a cada segundo
                currentSpeed = Math.max(currentSpeed, 0); // Garante que não fique negativo
                gaugeSpeed.refresh(currentSpeed); // Atualiza o gauge
                calculateMetaProjection(currentSpeed);
                console.log(`[LOG] Decadência aplicada. Velocidade atual: ${currentSpeed}`);
            }
        }

        let currentSpeed = 0; // Velocidade atual usada no gauge

        // Configura a decadência para ser executada a cada segundo
        const step = () => {
            const timeFormula = 3000 - currentSpeed * decaySpeedPower;

            console.log({ timeFormula });

            setTimeout(() => {
                applySpeedDecay();
                step();
            }, timeFormula);
        };

        step();

        function calculateMetaProjection(currentRate) {
            const now = new Date();
            const remainingMinutes = 60 - now.getMinutes();
            const projectedTotal = hourlyCount + (currentRate * remainingMinutes);

            if (projectedTotal >= META) {
                metaElement.innerHTML = `Você atingirá a meta no ritmo atual!<br><strong>Projeção: ${Math.round(projectedTotal)} pacotes.<strong>`;
                metaElement.style.color = "#1be300";
            } else {
                metaElement.innerHTML = `Meta não será atingida no ritmo atual!<br><strong>Projeção: ${Math.round(projectedTotal)} pacotes.<strong>`;
                metaElement.style.color = "#ff0000";
            }
        }

        function updateHourlyGauge() {
            gaugeHourly.refresh(hourlyCount);
            console.log(`[LOG] Gauge de Última Hora atualizado para: ${hourlyCount}`);
            saveState();
        }

        function setHourlyZero() {
            hourlyCount = 0;
            updateHourlyGauge();
        }

        function getOperadorNome() {
            // Seleciona o contêiner principal
            const container = document.querySelector('.task-detail-group');

            if (!container) {
                console.error('Contêiner ".task-detail-group" não encontrado.');
                return null;
            }

            // Seleciona o segundo ".task-detail-group-item" dentro do contêiner
            const operadorElement = container.querySelectorAll('.task-detail-group-item')[1];

            if (!operadorElement) {
                console.error('Elemento do operador não encontrado.');
                return null;
            }

            // Seleciona o <span> com a classe "static-label" dentro do item do operador
            const nameSpan = operadorElement.querySelector('.static-label');

            if (!nameSpan) {
                console.error('Elemento <span> com a classe "static-label" não encontrado.');
                return null;
            }

            // Captura e retorna o texto do operador
            const fullText = nameSpan.textContent.trim();

            // Processa o texto para extrair o nome
            if (fullText.startsWith('[Ops') && fullText.includes(']')) {
                // Extrai o nome após o formato "[Ops...]"
                return fullText.split(']').pop().trim().split(' ')[0]; // Retorna "Igor"
            } else if (/^([a-zA-Z]+)\.[a-zA-Z0-9]+@shopeemobile-external\.com$/.test(fullText)) {
                // Extrai o nome no formato "nome.sobrenome@shopeemobile-external.com"
                const nome = fullText.match(/^([a-zA-Z]+)\.[a-zA-Z0-9]+@shopeemobile-external\.com$/)[1];
                return nome.charAt(0).toUpperCase() + nome.slice(1); // Capitaliza o primeiro caractere
            } else {
                console.error("Texto do operador não está em um formato esperado.");
                return null;
            }
        }

        async function sendTotalRecived(value) {
            const operadorName = getOperadorNome();
            console.log('Nome:', operadorName);
            console.log('Valor:', value);

            fetch(`${globalLink}/api/store-station-values`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: operadorName,
                    value: value
                }),
            })
                .then((response) => response.json())
                .then((data) => console.log('Resposta:', data))
                .catch((error) => console.error('Erro:', error));
        }

        function monitorPackageCount() {
            username = getOperadorNome();

            console.log("Nome do colaborador:", username);

            const orderLabels = [ ...document.querySelectorAll('.order-label') ];
            const receivedLabel = orderLabels.find((label) => label.textContent.trim().toLowerCase() === 'recebido');
            const orderNumElement = receivedLabel.nextElementSibling;

            if (!orderNumElement) {
                console.error('Elemento .order-num não encontrado.');
                return;
            }

            // Inicializa o lastValue com o valor atual do elemento
            lastValue = parseInt(orderNumElement.textContent.trim(), 10) || 0;
            console.log(`[LOG] Valor inicial de lastValue: ${lastValue}`);

            const observer = new MutationObserver(() => {
                const currentValue = parseInt(orderNumElement.textContent.trim(), 10);

                if (!isNaN(currentValue) && currentValue > lastValue) {
                    const difference = currentValue - lastValue;
                    lastValue = currentValue;

                    // Adiciona o timestamp
                    timestamps.push(Date.now());
                    console.log(`[LOG] Timestamp adicionado, valor atualizado: ${currentValue}`);

                    // Incrementa o contador da última hora
                    hourlyCount += difference;
                    currentSpeed += difference;
                    gaugeSpeed.refresh(currentSpeed);
                    updateHourlyGauge();
                }
            });

            observer.observe(orderNumElement, { childList: true, characterData: true, subtree: true });

            // Atualiza o contador da última hora na virada da hora
            setInterval(() => {
                const currentHour = new Date().getHours();
                if (currentHour !== lastHourUpdate) {
                    // Atualiza o registro de hora
                    lastHourUpdate = currentHour;

                    // Reseta os timestamps e contador da última hora
                    timestamps = [];
                    hourlyCount = 0;

                    // Atualiza o gauge
                    updateHourlyGauge();

                    console.log(`[LOG] Nova hora detectada. Contador da última hora e gauge foram zerados.`);
                }
            }, 60000); // Verifica a cada minuto


            // Atalho para simular incremento de +1 no contador
            document.addEventListener('keydown', function(event) {
                if (event.ctrlKey && event.key === 'ç') {
                    currentSpeed++
                    gaugeSpeed.refresh(currentSpeed);
                    const simulatedValue = parseInt(orderNumElement.textContent.trim(), 10) + 1;
                    // orderNumElement.textContent = simulatedValue;
                    console.log(`[LOG] Incremento simulado: ${simulatedValue}`);
                }
            });
        }

        document.addEventListener('keydown', function(event) {
            if (event.ctrlKey && event.key === 'q') {
                event.preventDefault();
                setupGauge();
            }
        });

        document.addEventListener('keydown', function(event) {
            if (event.ctrlKey && event.key === '0') {
                event.preventDefault();
                setHourlyZero();
            }
        });

        setInterval(() => {
            const orderLabels = [ ...document.querySelectorAll('.order-label') ];
            const receivedLabel = orderLabels.find((label) => label.textContent.trim().toLowerCase() === 'recebido');
            const orderNumElement = receivedLabel.nextElementSibling;

            if (!orderNumElement) {
                console.error('Elemento .order-num não encontrado.');
                return;
            }

            // Inicializa o lastValue com o valor atual do elemento
            const totalRecived = parseInt(orderNumElement.textContent.trim(), 10) || 0;

            sendTotalRecived(totalRecived);
        },5000);
    }

    // Carregar RaphaelJS e JustGage
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/raphael/2.3.0/raphael.min.js', () => {
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/justgage/1.3.5/justgage.min.js', initialize);
    });
})();