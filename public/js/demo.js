class ForexDemoTrader {
    constructor() {
        this.data = {
            balance: 10000,
            profit: 0,
            bots: [],
            timeSpeed: 1,
            tradeHistory: []
        };

        this.currentPrice = 1.08542;
        this.basePrice = 1.08542;
        this.priceTrend = 0; // -1 down, 0 neutral, 1 up
        this.volatility = 0.0003;

        this.chart = null;
        this.elements = {};
        this.intervals = [];

        this.init();
    }

    init() {
        this.loadData();
        this.cacheElements();
        this.initChart();
        this.bindEvents();
        this.startSimulation();
        this.updateUI();
    }

    cacheElements() {
        const el = (id) => document.getElementById(id);
        this.elements = {
            balance: el('totalBalance'),
            profit: el('totalProfit'),
            activeBots: el('activeBots'),
            timeSpeed: el('timeSpeed'),
            currentPrice: el('currentPrice'),
            priceChange: el('priceChange'),
            botsContainer: el('bots-container'),
            tradeHistory: el('tradeHistory'),
            notification: el('notification'),
            transactionModal: el('transactionModal'),
            modalTitle: el('modalTitle'),
            modalDescription: el('modalDescription'),
            transactionAmount: el('transactionAmount'),
            guideModal: el('guideModal')
        };
    }

    loadData() {
        try {
            const saved = localStorage.getItem('forexpro_demo');
            if (saved) {
                this.data = { ...this.data, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Failed to load demo data:', e);
        }
    }

    saveData() {
        try {
            localStorage.setItem('forexpro_demo', JSON.stringify(this.data));
        } catch (e) {
            console.warn('Failed to save demo data:', e);
        }
    }

    initChart() {
        const ctx = document.getElementById('priceChart').getContext('2d');
        const initialData = Array(50).fill(this.currentPrice)
            .map((p, i) => p + Math.sin(i / 8) * 0.004 + (Math.random() - 0.5) * 0.002);

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(50).fill(''),
                datasets: [{
                    label: 'EUR/USD',
                    data: initialData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: { mode: 'nearest', intersect: false },
                scales: {
                    x: { display: false },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: 'rgba(255, 255, 255, 0.7)', callback: v => v.toFixed(5) }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    updatePrice() {
        // Simulate realistic price movement: trend + random walk + momentum
        const trendForce = this.priceTrend * 0.00005;
        const randomWalk = (Math.random() - 0.5) * this.volatility;
        const meanReversion = (this.basePrice - this.currentPrice) * 0.00002;

        this.currentPrice += (trendForce + randomWalk + meanReversion) * this.data.timeSpeed;

        // Occasionally change trend direction
        if (Math.random() < 0.003) {
            this.priceTrend = Math.random() < 0.5 ? -1 : 1;
        }
        if (Math.random() < 0.002) {
            this.priceTrend = 0;
        }

        // Update display
        this.elements.currentPrice.textContent = this.currentPrice.toFixed(5);

        const change = this.currentPrice - this.basePrice;
        const percent = (change / this.basePrice) * 100;

        this.elements.priceChange.textContent = 
            change >= 0 
                ? `+${change.toFixed(5)} (+${percent.toFixed(2)}%)`
                : `${change.toFixed(5)} (${percent.toFixed(2)}%)`;
        
        this.elements.priceChange.className = change >= 0 ? 'price-up' : 'price-down';

        // Update chart
        this.chart.data.datasets[0].data.shift();
        this.chart.data.datasets[0].data.push(this.currentPrice);
        this.chart.update('none');
    }

    createBot(name, investment) {
        if (this.data.balance < investment) {
            this.notify('Insufficient balance!', 'error');
            return false;
        }

        const totalReturn = investment * 2.25;
        const dailyProfit = totalReturn / 30;

        const bot = {
            id: Date.now() + Math.random(),
            name: name || `AI Bot #${this.data.bots.length + 1}`,
            investment,
            dailyProfit,
            totalProfit: totalReturn,
            progress: 0,
            createdAt: new Date().toISOString(),
            image: `https://images.unsplash.com/photo-${1639762681485 + Math.floor(Math.random()*10)}-074b7f938ba0?w=400&h=300&fit=crop`
        };

        this.data.bots.push(bot);
        this.data.balance -= investment;

        this.saveData();
        this.updateUI();
        this.renderBots();
        this.notify(`${bot.name} activated! Earning begins now.`, 'success');
        return true;
    }

    updateBotProgress() {
        if (this.data.bots.length === 0) return;

        let totalEarned = 0;

        this.data.bots.forEach(bot => {
            if (bot.progress >= 100) return;

            const increment = 0.1 * this.data.timeSpeed;
            bot.progress = Math.min(100, bot.progress + increment);

            const earnedThisTick = bot.dailyProfit * increment / (100 / increment);
            totalEarned += earnedThisTick;
        });

        if (totalEarned > 0) {
            this.data.balance += totalEarned;
            this.data.profit += totalEarned;
            this.updateUI();
            this.renderBots();
        }
    }

    executeTrade(type, amount, leverage = 10) {
        if (this.data.balance < amount) {
            this.notify('Not enough balance!', 'error');
            return;
        }

        // More realistic outcome: 60% win rate bias for demo
        const isWin = Math.random() < 0.6;
        const magnitude = 0.003 + Math.random() * 0.008;
        const profit = isWin 
            ? amount * leverage * magnitude 
            : -amount * leverage * magnitude * 0.8;

        this.data.balance += profit;
        this.data.profit += profit;

        const trade = {
            id: Date.now(),
            pair: 'EUR/USD',
            type: type.toUpperCase(),
            amount,
            leverage,
            price: this.currentPrice.toFixed(5),
            profit: parseFloat(profit.toFixed(2)),
            date: new Date().toLocaleString(),
            isWin
        };

        this.data.tradeHistory.unshift(trade);
        this.data.tradeHistory = this.data.tradeHistory.slice(0, 15);

        this.saveData();
        this.updateUI();
        this.renderTradeHistory();

        this.notify(
            profit >= 0 
                ? `Win! +KSH ${profit.toFixed(0).toLocaleString()} profit` 
                : `Loss: KSH ${Math.abs(profit).toFixed(0).toLocaleString()}`,
            profit >= 0 ? 'success' : 'error'
        );
    }

    renderBots() {
        const container = this.elements.botsContainer;
        container.innerHTML = '';

        if (this.data.bots.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-400">
                    <i class="fas fa-robot text-6xl mb-4 opacity-50"></i>
                    <p class="text-lg">No active bots</p>
                    <p class="text-sm mt-2">Click "Add Bot" to start earning passively</p>
                </div>`;
            return;
        }

        this.data.bots.forEach(bot => {
            const roi = ((bot.totalProfit - bot.investment) / bot.investment * 100).toFixed(0);
            const card = document.createElement('div');
            card.className = 'glass-card p-6 rounded-2xl hover-lift border border-white/20 clickable relative overflow-hidden';
            card.innerHTML = `
                <div class="demo-badge">2.25X GUARANTEED</div>
                <img src="${bot.image}" alt="bot" class="w-full h-48 object-cover rounded-lg mb-4">
                <div class="flex justify-between items-start mb-3">
                    <h3 class="text-xl font-bold text-white">${bot.name}</h3>
                    <span class="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs font-bold">
                        ${bot.progress >= 100 ? 'COMPLETED' : 'ACTIVE'}
                    </span>
                </div>
                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div><span class="text-gray-400">Invested:</span><br><strong>KSH ${bot.investment.toLocaleString()}</strong></div>
                    <div><span class="text-gray-400">Daily:</span><br><strong class="text-blue-400">KSH ${bot.dailyProfit.toFixed(0).toLocaleString()}</strong></div>
                    <div><span class="text-gray-400">Expected:</span><br><strong class="text-green-400">KSH ${bot.totalProfit.toLocaleString()}</strong></div>
                    <div><span class="text-gray-400">ROI:</span><br><strong class="text-cyan-400">+${roi}%</strong></div>
                </div>
                <div class="mt-5">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${bot.progress}%"></div>
                    </div>
                    <div class="flex justify-between mt-2 text-xs text-gray-400">
                        <span>30-Day Cycle</span>
                        <span>${bot.progress.toFixed(1)}% Complete</span>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    renderTradeHistory() {
        const container = this.elements.tradeHistory;
        container.innerHTML = '';

        if (this.data.tradeHistory.length === 0) {
            container.innerHTML = `<div class="text-center py-6 text-gray-500">No trades yet</div>`;
            return;
        }

        this.data.tradeHistory.forEach(trade => {
            const item = document.createElement('div');
            item.className = 'trade-history-item p-3 border-b border-white/10';
            item.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <div class="font-semibold">${trade.pair} <span class="text-xs ${trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'}">${trade.type}</span></div>
                        <div class="text-xs text-gray-400">${trade.date}</div>
                    </div>
                    <div class="text-right">
                        <div class="${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'} font-bold">
                            ${trade.profit >= 0 ? '+' : ''}KSH ${Math.abs(trade.profit).toLocaleString()}
                        </div>
                        <div class="text-xs text-gray-400">Lot: ${trade.amount} @ ${trade.price}</div>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    }

    updateUI() {
        this.elements.balance.textContent = `KSH ${this.data.balance.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
        this.elements.profit.textContent = `KSH ${this.data.profit.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
        this.elements.activeBots.textContent = this.data.bots.filter(b => b.progress < 100).length;
        this.elements.timeSpeed.textContent = `${this.data.timeSpeed}x`;
    }

    notify(message, type = 'success') {
        const n = this.elements.notification;
        n.textContent = message;
        n.className = `notification ${type} show`;
        setTimeout(() => n.className = 'notification', 3200);
    }

    bindEvents() {
        // Speed controls
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.data.timeSpeed = parseInt(btn.dataset.speed);
                this.updateUI();
            });
        });

        // Quick invest buttons
        document.querySelectorAll('.invest-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = parseInt(btn.dataset.price);
                this.createBot(`Pro Bot #${this.data.bots.length + 1}`, amount);
            });
        });

        // Add bot manually
        document.getElementById('addBotBtn')?.addEventListener('click', () => {
            const name = prompt('Bot Name (optional):')?.trim();
            const input = prompt('Investment Amount (KSH 1,000 - 500,000):');
            const amount = parseInt(input);
            if (amount && amount >= 1000 && amount <= 500000) {
                this.createBot(name || undefined, amount);
            } else if (input !== null) {
                this.notify('Invalid amount', 'error');
            }
        });

        // Trading buttons
        document.getElementById('buyBtn')?.addEventListener('click', () => {
            const amount = parseFloat(document.getElementById('tradeAmount').value);
            const leverage = parseInt(document.getElementById('leverage').value) || 10;
            if (amount > 0) this.executeTrade('buy', amount, leverage);
        });

        document.getElementById('sellBtn')?.addEventListener('click', () => {
            const amount = parseFloat(document.getElementById('tradeAmount').value);
            const leverage = parseInt(document.getElementById('leverage').value) || 10;
            if (amount > 0) this.executeTrade('sell', amount, leverage);
        });

        // Deposit/Withdraw
        document.getElementById('depositBtn')?.addEventListener('click', () => {
            this.elements.modalTitle.textContent = 'Deposit Funds';
            this.elements.modalDescription.textContent = 'Add funds to your demo account';
            this.elements.transactionModal.classList.add('active');
        });

        document.getElementById('withdrawBtn')?.addEventListener('click', () => {
            this.elements.modalTitle.textContent = 'Withdraw Funds';
            this.elements.modalDescription.textContent = 'Withdraw from your demo balance';
            this.elements.transactionModal.classList.add('active');
        });

        document.getElementById('confirmTransaction')?.addEventListener('click', () => {
            const amount = parseFloat(this.elements.transactionAmount.value);
            const isDeposit = this.elements.modalTitle.textContent.includes('Deposit');

            if (!amount || amount <= 0) return this.notify('Enter valid amount', 'error');

            if (isDeposit) {
                this.data.balance += amount;
                this.notify(`+KSH ${amount.toLocaleString()} deposited`, 'success');
            } else {
                if (this.data.balance < amount) return this.notify('Insufficient funds', 'error');
                this.data.balance -= amount;
                this.notify(`-KSH ${amount.toLocaleString()} withdrawn`, 'success');
            }

            this.updateUI();
            this.elements.transactionModal.classList.remove('active');
            this.saveData();
        });

        document.getElementById('cancelTransaction')?.addEventListener('click', () => {
            this.elements.transactionModal.classList.remove('active');
        });

        // Exit & Guide
        document.getElementById('exitDemoBtn')?.addEventListener('click', () => {
            if (confirm('Exit demo mode? Your progress is saved.')) {
                localStorage.removeItem('forexpro_demo');
                location.href = 'index.html';
            }
        });

        document.getElementById('guideBtn')?.addEventListener('click', () => {
            this.elements.guideModal.classList.add('active');
        });

        document.getElementById('closeGuide')?.addEventListener('click', () => {
            this.elements.guideModal.classList.remove('active');
        });
    }

    startSimulation() {
        this.intervals.push(
            setInterval(() => this.updatePrice(), 1000),
            setInterval(() => this.updateBotProgress(), 100)
        );
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.trader = new ForexDemoTrader();
});