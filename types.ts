export interface TicketData {
    number: string | number;
    carrier: string;
    route_name: string;
    bus_number: string;
    quantity: number;
    total_price: number;
    purchase_date: string;
    purchase_time: string;
}

declare global {
    interface Window {
        Telegram?: {
            WebApp: {
                expand: () => void;
                enableClosingConfirmation: () => void;
                close: () => void;
            }
        }
    }
}