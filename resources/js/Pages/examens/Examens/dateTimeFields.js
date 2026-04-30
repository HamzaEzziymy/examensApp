export const toInputDate = (value) => {
    if (!value) {
        return '';
    }

    const normalized = String(value).trim();
    const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/);

    if (match) {
        return match[1];
    }

    return normalized.substring(0, 10);
};

export const toInputTime = (value) => {
    if (!value) {
        return '';
    }

    const normalized = String(value).trim();
    const match = normalized.match(/(\d{2}:\d{2})(?::\d{2})?/);

    return match ? match[1] : '';
};

export const combineDateAndTime = (dateValue, timeValue) => {
    const date = toInputDate(dateValue);
    const time = toInputTime(timeValue);

    if (!date || !time) {
        return '';
    }

    return `${date}T${time}`;
};
