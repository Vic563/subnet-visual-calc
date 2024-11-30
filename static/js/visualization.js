class SubnetVisualizer {
    constructor() {
        this.chart = null;
        this.ctx = document.getElementById('subnet-visualization').getContext('2d');
        this.initializeChart();
    }

    initializeChart() {
        this.chart = new Chart(this.ctx, {
            type: 'tree',
            data: {
                datasets: [{
                    tree: [],
                    borderWidth: 2,
                    spacing: 50,
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--text-color'),
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const data = context.raw;
                                return [
                                    `Network: ${data.networkAddress}`,
                                    `Netmask: ${data.netmask}`,
                                    `Hosts: ${data.hosts}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }

    updateVisualization(subnets) {
        const treeData = this.buildTreeData(subnets);
        this.chart.data.datasets[0].tree = treeData;
        this.chart.update();
    }

    buildTreeData(subnets) {
        if (!subnets.length) return [];

        const rootSubnet = subnets[0];
        return {
            name: rootSubnet.networkAddress,
            networkAddress: rootSubnet.networkAddress,
            netmask: rootSubnet.netmask,
            hosts: rootSubnet.hosts,
            children: this.buildSubnetChildren(subnets.slice(1))
        };
    }

    buildSubnetChildren(subnets) {
        if (!subnets.length) return [];
        
        return subnets.map(subnet => ({
            name: subnet.networkAddress,
            networkAddress: subnet.networkAddress,
            netmask: subnet.netmask,
            hosts: subnet.hosts,
            children: []
        }));
    }
}

// Initialize visualizer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.visualizer = new SubnetVisualizer();
});
