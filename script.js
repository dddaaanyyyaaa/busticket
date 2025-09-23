// Инициализация Mini App
let tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

// Функция для получения параметров из URL
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Таймер обратного отсчета
function startTimer(duration, display) {
    let timer = duration, seconds;
    const interval = setInterval(() => {
        seconds = parseInt(timer, 10);
        display.textContent = seconds + " сек.";

        if (--timer < 0) {
            clearInterval(interval);
            tg.close();
        }
    }, 1000);
}

// НЕМЕДЛЕННАЯ инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // Получаем данные билета
    const ticketDataEncoded = getQueryParam('data');
    
    if (ticketDataEncoded) {
        try {
            const ticketDataJson = atob(ticketDataEncoded);
            const ticketData = JSON.parse(ticketDataJson);
            
            const formattedTicketNumber = ticketData.number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
            
            document.getElementById('order-id').textContent = formattedTicketNumber;
            document.getElementById('carrier').textContent = ticketData.carrier;
            document.getElementById('route').textContent = ticketData.route_name; // Убрали номер маршрута
            document.getElementById('bus').textContent = ticketData.bus_number;
            document.getElementById('price').textContent = `${ticketData.quantity} шт., Полный ${ticketData.total_price},00 ₽`;
            document.getElementById('date').textContent = ticketData.purchase_date;
            document.getElementById('time').textContent = ticketData.purchase_time;
        } catch (error) {
            console.error('Ошибка при обработке данных билета:', error);
            document.body.innerHTML = '<p>Ошибка загрузки билета. Неверный формат данных.</p>';
            return;
        }
    } else {
        document.body.innerHTML = '<p>Данные билета не предоставлены.</p>';
        return;
    }

    // НЕМЕДЛЕННЫЙ запуск таймера после заполнения данных
    const timerDisplay = document.getElementById('timer');
    const closeBtn = document.getElementById('close-button');
    
    startTimer(15, timerDisplay);
    closeBtn.addEventListener('click', () => tg.close());
});

// Запуск таймера немедленно (если элементы уже загружены)
if (document.getElementById('timer')) {
    const timerDisplay = document.getElementById('timer');
    startTimer(15, timerDisplay);
}