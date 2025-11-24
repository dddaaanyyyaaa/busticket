import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  IconTicketTab, 
  IconControlTab, 
  IconCarrier, 
  IconRoute, 
  IconBus, 
  IconDate, 
  IconTime 
} from './components/Icons';
import { TicketData } from './types';

// Mock data for development if URL params aren't present
const MOCK_DATA: TicketData = {
  number: "867291334",
  carrier: "ИП Долгушин Д.Г.",
  route_name: "пос.Таймир-мкрн. Тихие зори",
  bus_number: "o772op124",
  quantity: 1,
  total_price: 44,
  purchase_date: "12 мая 2024 г.",
  purchase_time: "12:38"
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'ticket' | 'control'>('ticket');
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [error, setError] = useState<string | null>(null);

  // Initialize Telegram WebApp and Parse Data
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.expand();
      tg.enableClosingConfirmation();
    }

    const searchParams = new URLSearchParams(window.location.search);
    const dataParam = searchParams.get('data');

    if (dataParam) {
      try {
        const decoded = atob(dataParam);
        const parsed = JSON.parse(decoded);
        setTicketData(parsed);
      } catch (e) {
        console.error("Failed to parse ticket data", e);
        setError("Ошибка загрузки билета. Неверный формат данных.");
      }
    } else {
      // Fallback for dev/demo purposes if no data param is provided
      // In production, you might want to show an error instead
      setTicketData(MOCK_DATA);
    }
  }, []);

  // Timer Logic
  useEffect(() => {
    if (timeLeft <= 0) {
      const tg = window.Telegram?.WebApp;
      if (tg) tg.close();
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft]);

  // Format ticket number for display (groups of 3)
  const formattedTicketNumber = useMemo(() => {
    if (!ticketData) return "";
    return ticketData.number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }, [ticketData]);

  const handleClose = () => {
    const tg = window.Telegram?.WebApp;
    if (tg) tg.close();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#292929] text-[#D4D4D4]">
        <p>{error}</p>
      </div>
    );
  }

  if (!ticketData) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#292929] text-[#D4D4D4]">
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#292929] text-[#D4D4D4] font-sans">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[#303030] pt-2.5 bg-[#292929] z-10">
        <div className="text-center text-[20px] font-medium text-[#D4D4D4] mb-[25px]">
          Действует: <span className="tabular-nums">{timeLeft} сек.</span>
        </div>
        
        <div className="flex items-center justify-center gap-5">
          <button 
            onClick={() => setActiveTab('ticket')}
            className={`
              pb-[11px] px-[13px] border-b-2 flex items-center gap-[6px] text-[16px] font-medium transition-colors duration-200
              ${activeTab === 'ticket' 
                ? 'border-[#E21A1A] text-[#E21A1A]' 
                : 'border-transparent text-[#D4D4D4]'
              }
            `}
          >
            <IconTicketTab isActive={activeTab === 'ticket'} />
            <b className="font-medium">{formattedTicketNumber}</b>
          </button>

          <button 
            onClick={() => setActiveTab('control')}
            className={`
              pb-[11px] px-[13px] border-b-2 flex items-center gap-[6px] text-[16px] font-medium transition-colors duration-200
              ${activeTab === 'control' 
                ? 'border-[#E21A1A] text-[#E21A1A]' 
                : 'border-transparent text-[#D4D4D4]'
              }
            `}
          >
            <IconControlTab isActive={activeTab === 'control'} />
            <span>Контроль</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        
        {/* Ticket Info View */}
        {activeTab === 'ticket' && (
          <div className="w-full h-full overflow-y-auto px-5 pt-[15px] pb-4">
            
            <InfoItem 
              icon={<IconCarrier />}
              label="Перевозчик"
              value={ticketData.carrier}
            />
            
            <InfoItem 
              icon={<IconRoute />}
              label={ticketData.route_name}
              value={ticketData.bus_number}
              valueClassName="uppercase"
            />
            
            <InfoItem 
              icon={<IconBus />}
              label="Стоимость"
              value={`${ticketData.quantity} шт., Полный ${ticketData.total_price}.00 ₽`}
            />
            
            <InfoItem 
              icon={<IconDate />}
              label="Дата покупки"
              value={ticketData.purchase_date}
            />
            
            <InfoItem 
              icon={<IconTime />}
              label="Время покупки:"
              value={ticketData.purchase_time}
              isLast={true}
            />

          </div>
        )}

        {/* Control View */}
        {activeTab === 'control' && (
          <div className="w-full h-full flex flex-col items-center pt-10 px-5 overflow-y-auto">
            <div className="p-[15px] bg-white rounded-[10px] inline-block mb-5">
              <QRCodeSVG 
                value={ticketData.number.toString()} 
                size={200}
                level="H"
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>
            <div className="text-[24px] font-bold text-[#D4D4D4] mt-5">
              № {formattedTicketNumber}
            </div>
          </div>
        )}
      </div>

      {/* Footer Button */}
      <div className="flex-shrink-0 w-full p-[10px_20px_30px] bg-[#1A1A1A]">
        <button 
          onClick={handleClose}
          className="w-full h-[48px] bg-[#E21A1A] text-white text-[17px] font-medium rounded-[10px] flex items-center justify-center uppercase active:opacity-90 transition-opacity"
        >
          закрыть
        </button>
      </div>
    </div>
  );
}

// Helper Component for List Items
interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
  isLast?: boolean;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon, label, value, valueClassName = "", isLast = false }) => {
  return (
    <div className={`flex items-center gap-[5px] py-[6px] pb-[10px] ${!isLast ? 'border-b border-[#303030]' : ''}`}>
      <div className="min-w-[45px] max-w-[45px] flex items-center justify-center">
        {icon}
      </div>
      <div className="flex flex-col">
        <p className="text-[16px] text-[#787878] font-medium mb-[4px] leading-tight">{label}</p>
        <div className={`text-[22px] text-[#D4D4D4] font-medium leading-tight ${valueClassName}`}>{value}</div>
      </div>
    </div>
  );
};
