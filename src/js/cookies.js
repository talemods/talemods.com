export function readCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

export function writeCookie(name, value) {
    const expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + 365 * 864e5);
    document.cookie = name + '=' + value + ';expires=' + expiryDate.toUTCString() + ';path=/';
}
