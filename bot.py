import asyncio
import random
import base64
import json
from datetime import datetime, timedelta
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.utils.keyboard import InlineKeyboardBuilder, ReplyKeyboardBuilder
from aiogram.types import InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton, WebAppInfo

# --- Конфигурация ---
BOT_TOKEN = "7489239125:AAHNQv2wQhJoZyk8d8JQGfznio-bbvNQ5sA"
TICKET_PRICE = 48
TIMEZONE_OFFSET = timedelta(hours=7)  # UTC+7
BUS_REGION = "124"  # Регион для номера автобуса
MINI_APP_URL = "https://busticket-three.vercel.app/"  # URL вашего Mini App

# --- Данные о маршрутах и перевозчиках ---
routes_data = {
    "94": {
        "name": "ЛДК - ТЭЦ-3",
        "carriers": {
            "ООО Практик": "ООО Практик",
            "ООО МаршрутАвто": "ООО МаршрутАвто",
            "ИП Карасева Н. Н.": "ИП Карасева Н. Н."
        }
    },
    "52": {
        "name": "ЛДК - Озеро-парк",
        "carriers": {
            "КПАТП-5": "КПАТП-5"
        }
    },    
    "98": {
        "name": "Вокзал - Посёлок Северный", 
        "carriers": {
            "ИП Гнетов Ю. Н.": "ИП Гнетов Ю. Н."
        }
    },
        "95": {
        "name": "Верхние Черемушки-ЛДК", 
        "carriers": {
            "КПАТП-7": "КПАТП-7"
        }
    }
}

# --- Машина состояний (FSM) ---
class TicketPurchase(StatesGroup):
    waiting_route = State()
    waiting_carrier = State()
    waiting_bus = State()
    waiting_quantity = State()

# --- Инициализация бота и диспетчера ---
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# --- Вспомогательные функции ---
def get_carrier_keyboard(route_number: str) -> ReplyKeyboardMarkup:
    """Создает клавиатуру с перевозчиками для выбранного маршрута"""
    builder = ReplyKeyboardBuilder()
    carriers = routes_data[route_number]["carriers"]
    
    for carrier in carriers.values():
        builder.add(KeyboardButton(text=carrier))
    
    builder.adjust(2)
    return builder.as_markup(resize_keyboard=True)

def get_start_keyboard() -> ReplyKeyboardMarkup:
    """Создает клавиатуру с кнопкой начала покупки"""
    builder = ReplyKeyboardBuilder()
    builder.add(KeyboardButton(text="🎫 Купить билет"))
    return builder.as_markup(resize_keyboard=True)

async def delete_messages(chat_id: int, message_ids: list):
    """Удаляет список сообщений"""
    for msg_id in message_ids:
        try:
            await bot.delete_message(chat_id=chat_id, message_id=msg_id)
        except Exception:
            # Игнорируем ошибки удаления (сообщение уже удалено или нет прав)
            pass

# --- Хэндлеры ---

# Start command
@dp.message(Command("start"))
async def cmd_start(message: types.Message, state: FSMContext):
    await state.clear()
    await message.answer(
        "👋 Добро пожаловать! Нажмите кнопку ниже чтобы купить билет:",
        reply_markup=get_start_keyboard()
    )

# Обработка кнопки "Купить билет"
@dp.message(F.text == "🎫 Купить билет")
async def start_purchase(message: types.Message, state: FSMContext):
    # Удаляем сообщение с кнопкой
    try:
        await message.delete()
    except:
        pass
    
    # Инициализируем список сообщений для удаления
    await state.set_data({"messages_to_delete": []})
    await ask_for_route(message, state)

async def ask_for_route(message: types.Message, state: FSMContext):
    """Запрос номера маршрута"""
    msg = await message.answer(
        "Введите номер маршрута (например: 94):",
        reply_markup=types.ReplyKeyboardRemove()
    )
    
    # Сохраняем ID сообщения для последующего удаления
    data = await state.get_data()
    messages_to_delete = data.get("messages_to_delete", [])
    messages_to_delete.append(msg.message_id)
    await state.update_data(messages_to_delete=messages_to_delete)
    
    await state.set_state(TicketPurchase.waiting_route)

# Обработка ввода номера маршрута
@dp.message(TicketPurchase.waiting_route)
async def process_route(message: types.Message, state: FSMContext):
    # Сохраняем ID сообщения пользователя для удаления
    data = await state.get_data()
    messages_to_delete = data.get("messages_to_delete", [])
    messages_to_delete.append(message.message_id)
    
    route_number = message.text.strip()
    
    if route_number not in routes_data:
        msg = await message.answer("❌ Маршрут не найден. Введите корректный номер маршрута:")
        messages_to_delete.append(msg.message_id)
        await state.update_data(messages_to_delete=messages_to_delete)
        return
    
    await state.update_data(route_number=route_number)
    
    # Получаем клавиатуру с перевозчиками для этого маршрута
    keyboard = get_carrier_keyboard(route_number)
    
    msg = await message.answer(
        f"Маршрут {route_number} - {routes_data[route_number]['name']}\n"
        "Выберите перевозчика:",
        reply_markup=keyboard
    )
    messages_to_delete.append(msg.message_id)
    await state.update_data(messages_to_delete=messages_to_delete)
    await state.set_state(TicketPurchase.waiting_carrier)

# Обработка выбора перевозчика
@dp.message(TicketPurchase.waiting_carrier)
async def process_carrier(message: types.Message, state: FSMContext):
    # Сохраняем ID сообщения пользователя для удаления
    data = await state.get_data()
    messages_to_delete = data.get("messages_to_delete", [])
    messages_to_delete.append(message.message_id)
    
    carrier = message.text.strip()
    data = await state.get_data()
    route_number = data['route_number']
    
    # Проверяем, что выбранный перевозчик есть для этого маршрута
    if carrier not in routes_data[route_number]["carriers"].values():
        msg = await message.answer("❌ Пожалуйста, выберите перевозчика из предложенных вариантов:")
        messages_to_delete.append(msg.message_id)
        await state.update_data(messages_to_delete=messages_to_delete)
        return
    
    await state.update_data(carrier=carrier)
    msg = await message.answer(
        "Введите номер автобуса (первые 6 символов, например: x677ca):",
        reply_markup=types.ReplyKeyboardRemove()
    )
    messages_to_delete.append(msg.message_id)
    await state.update_data(messages_to_delete=messages_to_delete)
    await state.set_state(TicketPurchase.waiting_bus)

# Обработка ввода номера автобуса
@dp.message(TicketPurchase.waiting_bus)
async def process_bus(message: types.Message, state: FSMContext):
    # Сохраняем ID сообщения пользователя для удаления
    data = await state.get_data()
    messages_to_delete = data.get("messages_to_delete", [])
    messages_to_delete.append(message.message_id)
    
    bus_prefix = message.text.strip()
    
    if len(bus_prefix) != 6 or not bus_prefix.isalnum():
        msg = await message.answer("❌ Номер автобуса должен состоять из 6 символов (буквы и цифры). Попробуйте еще раз:")
        messages_to_delete.append(msg.message_id)
        await state.update_data(messages_to_delete=messages_to_delete)
        return
    
    full_bus_number = f"{bus_prefix}{BUS_REGION}"
    await state.update_data(bus_number=full_bus_number)
    msg = await message.answer("Введите количество билетов:")
    messages_to_delete.append(msg.message_id)
    await state.update_data(messages_to_delete=messages_to_delete)
    await state.set_state(TicketPurchase.waiting_quantity)

# Обработка ввода количества билетов
@dp.message(TicketPurchase.waiting_quantity)
async def process_quantity(message: types.Message, state: FSMContext):
    # Сохраняем ID сообщения пользователя для удаления
    data = await state.get_data()
    messages_to_delete = data.get("messages_to_delete", [])
    messages_to_delete.append(message.message_id)
    
    try:
        quantity = int(message.text)
        if quantity <= 0:
            raise ValueError
    except ValueError:
        msg = await message.answer("❌ Пожалуйста, введите корректное число (больше 0):")
        messages_to_delete.append(msg.message_id)
        await state.update_data(messages_to_delete=messages_to_delete)
        return
    
    # Получаем все данные из состояния
    data = await state.get_data()
    route_number = data['route_number']
    route_name = routes_data[route_number]['name']
    carrier = data['carrier']
    bus_number = data['bus_number']
    messages_to_delete = data.get("messages_to_delete", [])
    
    total_price = TICKET_PRICE * quantity
    
    # Генерируем билет
    ticket_number = random.randint(1300000000, 2000000000)
    purchase_time = datetime.utcnow() + TIMEZONE_OFFSET
    valid_until = purchase_time + timedelta(hours=2)  # Действует 2 часа
    
    # Форматируем время
    valid_until_str = valid_until.strftime("%H:%M")
    
    # Формируем сообщение с билетом
    ticket_message = (
        f"<b>Билет куплен успешно.</b>\n"
        f"{carrier}\n"
        f"🚏 {route_number} {route_name}\n"
        f"🚌 {bus_number}\n"
        f"🪙 Тариф: Полный {total_price},00 ₽\n"
        f"🎫 Билет № {ticket_number}\n"
        f"🕑 Действует до {valid_until_str}"
    )
    
    # Создаем кнопку "Предъявить билет" с Mini App
    ticket_data = {
        "number": ticket_number,
        "route_number": route_number,
        "route_name": route_name,
        "carrier": carrier,
        "bus_number": bus_number,
        "valid_until": valid_until_str,
        "price": TICKET_PRICE,
        "quantity": quantity,
        "total_price": total_price
    }
    
    ticket_data_json = json.dumps(ticket_data)
    ticket_data_b64 = base64.urlsafe_b64encode(ticket_data_json.encode()).decode()
    
    # Формируем URL для Mini App с данными билета
    mini_app_url = f"{MINI_APP_URL}?data={ticket_data_b64}"
    
    # Создаем кнопку с WebApp
    web_app = WebAppInfo(url=mini_app_url)
    keyboard = InlineKeyboardBuilder()
    keyboard.row(InlineKeyboardButton(text="🎫 Предъявить билет", web_app=web_app))
    
    # Удаляем все предыдущие сообщения (и бота, и пользователя)
    await delete_messages(message.chat.id, messages_to_delete)
    
    # Отправляем финальное сообщение с билетом
    await message.answer(
        ticket_message,
        reply_markup=keyboard.as_markup(),
        parse_mode="HTML"
    )
    
    await state.clear()

# --- Запуск бота ---
async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())