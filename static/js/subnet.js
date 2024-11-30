class SubnetCalculator {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.subnets = [];
    }

    initializeElements() {
        this.networkInput = document.getElementById('network-address');
        this.maskInput = document.getElementById('mask-bits');
        this.subnetTable = document.getElementById('subnet-table');
        this.columnToggles = document.querySelectorAll('.column-toggle');
    }

    attachEventListeners() {
        this.networkInput.addEventListener('input', () => {
            if (this.networkInput.value && this.maskInput.value) {
                this.calculateSubnet();
            }
        });
        this.maskInput.addEventListener('input', () => {
            if (this.networkInput.value && this.maskInput.value) {
                this.calculateSubnet();
            }
        });
        this.columnToggles.forEach(toggle => {
            toggle.addEventListener('change', () => this.updateTableDisplay());
        });
    }

    calculateSubnet() {
        const network = this.networkInput.value;
        const maskBits = parseInt(this.maskInput.value);

        if (!this.isValidIPv4(network) || !this.isValidMaskBits(maskBits)) {
            return;
        }

        const networkDetails = this.getNetworkDetails(network, maskBits);
        this.subnets = [networkDetails];
        this.updateTable();
        
        // Update URL for bookmarking
        updateUrlWithNetwork(network, maskBits);
    }

    isValidIPv4(ip) {
        const parts = ip.split('.');
        if (parts.length !== 4) return false;
        
        return parts.every(part => {
            const num = parseInt(part);
            return num >= 0 && num <= 255;
        });
    }

    isValidMaskBits(bits) {
        return bits >= 0 && bits <= 32;
    }

    getNetworkDetails(network, maskBits) {
        const networkParts = network.split('.').map(Number);
        const mask = this.calculateSubnetMask(maskBits);
        const networkAddr = this.calculateNetworkAddress(networkParts, mask);
        const broadcast = this.calculateBroadcast(networkAddr, maskBits);
        const usableHosts = Math.pow(2, 32 - maskBits) - 2;

        return {
            networkAddress: networkAddr.join('.') + '/' + maskBits,
            netmask: mask.join('.'),
            range: `${networkAddr.join('.')} - ${broadcast.join('.')}`,
            usableRange: this.calculateUsableRange(networkAddr, broadcast),
            hosts: usableHosts,
            maskBits: maskBits
        };
    }

    calculateSubnetMask(bits) {
        const mask = new Array(4).fill(0);
        for (let i = 0; i < bits; i++) {
            mask[Math.floor(i/8)] |= 1 << (7 - (i % 8));
        }
        return mask;
    }

    calculateNetworkAddress(ip, mask) {
        return ip.map((octet, i) => octet & mask[i]);
    }

    calculateBroadcast(network, maskBits) {
        const broadcast = [...network];
        const hostBits = 32 - maskBits;
        for (let i = 3; i >= 0; i--) {
            const bitsInThisOctet = Math.min(8, Math.max(0, hostBits - (3-i)*8));
            broadcast[i] |= (1 << bitsInThisOctet) - 1;
        }
        return broadcast;
    }

    calculateUsableRange(network, broadcast) {
        const first = [...network];
        first[3]++;
        const last = [...broadcast];
        last[3]--;
        return `${first.join('.')} - ${last.join('.')}`;
    }

    divideSubnet(index) {
        const subnet = this.subnets[index];
        const newMaskBits = subnet.maskBits + 1;
        if (newMaskBits > 32) return;

        const network = subnet.networkAddress.split('/')[0];
        const firstSubnet = this.getNetworkDetails(network, newMaskBits);
        
        const secondNetworkParts = network.split('.').map(Number);
        const increment = Math.pow(2, 32 - newMaskBits);
        secondNetworkParts[3] += increment;
        const secondSubnet = this.getNetworkDetails(secondNetworkParts.join('.'), newMaskBits);

        this.subnets.splice(index, 1, firstSubnet, secondSubnet);
        this.updateTable();
    }

    joinSubnets(index) {
        const subnet1 = this.subnets[index];
        const baseNetwork = subnet1.networkAddress.split('/')[0];
        const baseIp = this.ipToNumber(baseNetwork);
        
        // Find all subnets that are part of this network
        const subnetRange = Math.pow(2, 32 - subnet1.maskBits);
        const endIp = baseIp + subnetRange;
        
        // Find all subnets that fall within this range
        let endIndex = index + 1;
        let currentMaskBits = null;
        let consecutiveCount = 1;
        
        while (endIndex < this.subnets.length) {
            const nextSubnet = this.subnets[endIndex];
            const nextIp = this.ipToNumber(nextSubnet.networkAddress.split('/')[0]);
            
            // If we've gone beyond our subnet range, stop
            if (nextIp >= endIp) break;
            
            // Keep track of subnets with the same mask bits
            if (currentMaskBits === null) {
                currentMaskBits = nextSubnet.maskBits;
                consecutiveCount = 1;
            } else if (currentMaskBits === nextSubnet.maskBits) {
                consecutiveCount++;
            } else {
                // If we find a different mask bit size, reset counter
                currentMaskBits = nextSubnet.maskBits;
                consecutiveCount = 1;
            }
            
            endIndex++;
        }
        
        if (endIndex <= index + 1) return; // Nothing to join
        
        // Join all subnets in the range
        const targetMaskBits = subnet1.maskBits - Math.log2(endIndex - index);
        if (targetMaskBits < 0) return;
        
        const joinedSubnet = this.getNetworkDetails(baseNetwork, targetMaskBits);
        this.subnets.splice(index, endIndex - index, joinedSubnet);
        this.updateTable();
    }

    ipToNumber(ip) {
        return ip.split('.').reduce((acc, octet, i) => acc + (Number(octet) << (24 - (i * 8))), 0);
    }

    updateTable() {
        const tbody = this.subnetTable.querySelector('tbody');
        tbody.innerHTML = '';

        this.subnets.forEach((subnet, index) => {
            const row = document.createElement('tr');
            row.className = 'subnet-row';
            
            const columns = [
                subnet.networkAddress,
                subnet.netmask,
                subnet.range,
                subnet.usableRange,
                subnet.hosts,
                `<button class="divide-btn btn btn-sm btn-outline-primary" onclick="calculator.divideSubnet(${index})">Divide</button>`,
                `<button class="join-btn btn btn-sm btn-outline-secondary" onclick="calculator.joinSubnets(${index})">Join</button>`
            ];

            columns.forEach(content => {
                const td = document.createElement('td');
                td.innerHTML = content;
                row.appendChild(td);
            });

            tbody.appendChild(row);
        });
    }

    updateTableDisplay() {
        const columns = Array.from(document.querySelectorAll('th[data-column]'));
        columns.forEach((column, index) => {
            const isVisible = document.getElementById(`toggle-${column.dataset.column}`).checked;
            const cells = document.querySelectorAll(`td:nth-child(${index + 1}), th:nth-child(${index + 1})`);
            cells.forEach(cell => {
                cell.style.display = isVisible ? '' : 'none';
            });
        });
    }
}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calculator = new SubnetCalculator();
});
