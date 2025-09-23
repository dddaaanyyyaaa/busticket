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

// Переменная для хранения номера билета без пробелов
let ticketNumberWithoutSpaces = '';

// НЕМЕДЛЕННАЯ инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // Получаем данные билета
    const ticketDataEncoded = getQueryParam('data');
    
    if (ticketDataEncoded) {
        try {
            const ticketDataJson = atob(ticketDataEncoded);
            const ticketData = JSON.parse(ticketDataJson);
            
            // Сохраняем номер без пробелов для QR-кода
            ticketNumberWithoutSpaces = ticketData.number.toString();
            
            // Форматируем номер билета (добавляем пробелы для читаемости)
            const formattedTicketNumber = ticketNumberWithoutSpaces.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
            
            document.getElementById('order-id').textContent = formattedTicketNumber;
            document.getElementById('carrier').textContent = ticketData.carrier;
            document.getElementById('route').textContent = ticketData.route_name; // Только название маршрута
            document.getElementById('bus').textContent = ticketData.bus_number;
            document.getElementById('price').textContent = `${ticketData.quantity} шт., Полный ${ticketData.total_price},00 ₽`;
            document.getElementById('date').textContent = ticketData.purchase_date;
            document.getElementById('time').textContent = ticketData.purchase_time;
            
            // Устанавливаем номер билета для контроля
            document.getElementById('control-ticket-number').textContent = formattedTicketNumber;
        } catch (error) {
            console.error('Ошибка при обработке данных билета:', error);
            document.body.innerHTML = '<p>Ошибка загрузки билета. Неверный формат данных.</p>';
            return;
        }
    } else {
        document.body.innerHTML = '<p>Данные билета не предоставлены.</p>';
        return;
    }

    // Переменные для вкладок
    const ticketTab = document.getElementById('ticket-tab');
    const controlTab = document.getElementById('control-tab');
    const ticketContent = document.getElementById('ticket-content');
    const controlContent = document.getElementById('control-content');

    // Обработчики клика по вкладкам
    ticketTab.addEventListener('click', () => {
        ticketTab.classList.add('active');
        controlTab.classList.remove('active');
        ticketContent.style.display = 'block';
        controlContent.style.display = 'none';
    });

    controlTab.addEventListener('click', () => {
        controlTab.classList.add('active');
        ticketTab.classList.remove('active');
        ticketContent.style.display = 'none';
        controlContent.style.display = 'block';

        // Генерируем QR-код только при первом клике
        if (!document.getElementById('qrcode').hasChildNodes()) {
            new QRCode(document.getElementById('qrcode'), {
                text: ticketNumberWithoutSpaces,
                width: 200,
                height: 200,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
        }
    });

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
