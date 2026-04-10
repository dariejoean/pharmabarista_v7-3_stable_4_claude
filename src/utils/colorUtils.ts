export const hexToLuminance = (hex: string): number => {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
};

export const isLightColor = (hex: string): boolean => hexToLuminance(hex) > 128;
