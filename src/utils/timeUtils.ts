export const formatTime = (date: Date): { date: string, time: string } => {
    return {
        date: date.toLocaleDateString('ro-RO'),
        time: date.toLocaleTimeString('ro-RO', { hour12: false, hour: '2-digit', minute: '2-digit' })
    };
};
