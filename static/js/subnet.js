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
        const subnet = this.subnets[index];
        if (index + 1 >= this.subnets.length) return;
        
        const nextSubnet = this.subnets[index + 1];
        if (subnet.maskBits !== nextSubnet.maskBits) return;
        
        // Extract network addresses without mask bits
        const network1 = subnet.networkAddress.split('/')[0];
        const network2 = nextSubnet.networkAddress.split('/')[0];
        
        // Convert to numbers for comparison
        const num1 = this.ipToNumber(network1);
        const num2 = this.ipToNumber(network2);
        
        // Calculate the size of the current subnet blocks
        const blockSize = Math.pow(2, 32 - subnet.maskBits);
        
        // Check if these subnets are adjacent and can be joined
        if (num2 - num1 !== blockSize) return;
        
        // Check if the first subnet starts on a valid boundary for the joined subnet
        const newMaskBits = subnet.maskBits - 1;
        const boundaryMask = ~(Math.pow(2, 32 - newMaskBits) - 1);
        if ((num1 & boundaryMask) !== num1) return;
        
        // Join the subnets using the first network address
        const joinedSubnet = this.getNetworkDetails(network1, newMaskBits);
        
        // Replace the two subnets with the joined one
        this.subnets.splice(index, 2, joinedSubnet);
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
