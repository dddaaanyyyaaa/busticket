async function fetchOrderData(orderId) {
    try {
        const response = await fetch(`/api/order/${orderId}`);
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const { order } = await response.json();
        
        document.getElementById('ip').textContent = order.ip;
        document.getElementById('tr-num').textContent = order.bus_numb;
        document.getElementById('price').textContent = `${order.order_count} шт., Полный, ${order.price} ₽`;
        document.getElementById('date').textContent = order.order_date + ' г.';
        document.getElementById('time').textContent = order.order_time;
        document.getElementById('tr-marsh').textContent = order.description;
        document.getElementById('order-id').textContent = (+order.id + 867291334).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');;
        
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
}

function getOrderIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

function startTimer(duration, display, telegramWebApp) {
    let timer = duration, seconds;
    const interval = setInterval(() => {
        seconds = parseInt(timer, 10);

        display.textContent = seconds + " сек.";

        if (--timer < 0) {
            clearInterval(interval);
            telegramWebApp.close();
        }
    }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    const timerDisplay = document.getElementById('timer');
    const closeBtn = document.getElementById('close-button');
    const orderId = getOrderIdFromUrl();
    
    if (orderId) {
        fetchOrderData(orderId);
    } else {
        console.error('Order ID not found in URL');
    }

    if (window.Telegram && window.Telegram.WebApp) {
        const telegramWebApp = window.Telegram.WebApp;

        telegramWebApp.expand();
        telegramWebApp.setBackgroundColor('#000');
        telegramWebApp.setHeaderColor('#000');

        startTimer(15, timerDisplay, telegramWebApp);
        closeBtn.addEventListener('click', () => telegramWebApp.close());
    }
});
