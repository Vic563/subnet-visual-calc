function validateIPAddress(ip) {
    const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!pattern.test(ip)) return false;
    
    return ip.split('.').every(part => {
        const num = parseInt(part);
        return num >= 0 && num <= 255;
    });
}

function validateMaskBits(bits) {
    const num = parseInt(bits);
    return !isNaN(num) && num >= 0 && num <= 32;
}

function updateUrlWithNetwork(network, mask) {
    const url = new URL(window.location);
    url.searchParams.set('network', network);
    url.searchParams.set('mask', mask);
    window.history.pushState({}, '', url);
}

function loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const network = params.get('network');
    const mask = params.get('mask');
    
    if (network && mask) {
        document.getElementById('network-address').value = network;
        document.getElementById('mask-bits').value = mask;
        calculator.calculateSubnet();
    }
}
