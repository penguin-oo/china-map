/**
 * 中国交互式地图 - 主应用逻辑
 */

// 全局变量
let mapChart = null;
let comparisonChart = null;
let currentMode = 'population';
let currentProvince = null;
let zoomLevel = 1;

// DOM 元素
const elements = {
    map: null,
    loading: null,
    provinceName: null,
    provincePinyin: null,
    adminLevel: null,
    capital: null,
    population: null,
    area: null,
    gdp: null,
    gdpPerCapita: null,
    cuisine: null,
    attractions: null,
    description: null,
    comparisonChart: null
};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    initMap();
    initControls();
    hideLoading();
});

// 初始化 DOM 元素引用
function initElements() {
    elements.map = document.getElementById('china-map');
    elements.loading = document.getElementById('loading');
    elements.provinceName = document.getElementById('province-name');
    elements.provincePinyin = document.getElementById('province-pinyin');
    elements.adminLevel = document.getElementById('admin-level');
    elements.capital = document.getElementById('capital');
    elements.population = document.getElementById('population');
    elements.area = document.getElementById('area');
    elements.gdp = document.getElementById('gdp');
    elements.gdpPerCapita = document.getElementById('gdp-per-capita');
    elements.cuisine = document.getElementById('cuisine');
    elements.attractions = document.getElementById('attractions');
    elements.description = document.getElementById('description');
    elements.comparisonChart = document.getElementById('comparison-chart');
}

// 初始化地图
function initMap() {
    mapChart = echarts.init(elements.map);

    const option = getMapOption(currentMode);
    mapChart.setOption(option);

    // 绑定点击事件
    mapChart.on('click', (params) => {
        if (params.componentType === 'series') {
            handleProvinceClick(params.name);
        }
    });

    // 绑定鼠标悬浮事件
    mapChart.on('mouseover', (params) => {
        if (params.componentType === 'series') {
            mapChart.dispatchAction({
                type: 'highlight',
                seriesIndex: 0,
                name: params.name
            });
        }
    });

    mapChart.on('mouseout', (params) => {
        if (params.componentType === 'series') {
            mapChart.dispatchAction({
                type: 'downplay',
                seriesIndex: 0,
                name: params.name
            });
        }
    });

    // 响应式调整
    window.addEventListener('resize', () => {
        mapChart.resize();
        if (comparisonChart) {
            comparisonChart.resize();
        }
    });

    // 初始化对比图表
    initComparisonChart();
}

// 获取地图配置 - 支持根据选中省份动态调整颜色
function getMapOption(mode, selectedProvinceName = null) {
    // 生成人均GDP数据数组
    const gdpPerCapitaData = Object.entries(provinceData).map(([name, data]) => ({
        name: name,
        value: data.gdpPerCapita || 0
    }));

    const dataMap = {
        population: populationData,
        gdp: gdpData,
        area: areaData,
        gdpPerCapita: gdpPerCapitaData
    };

    // 默认颜色范围
    let colorRanges = {
        population: {
            min: 0,
            max: 13000,
            colors: ['#1a1a2e', '#16213e', '#0f3460', '#e74c3c']
        },
        gdp: {
            min: 0,
            max: 130000,
            colors: ['#1a1a2e', '#16213e', '#1e5631', '#3d9140']
        },
        area: {
            min: 0,
            max: 1700000,
            colors: ['#1a1a2e', '#16213e', '#4a235a', '#9b59b6']
        },
        gdpPerCapita: {
            min: 0,
            max: 400000,
            colors: ['#1a1a2e', '#16213e', '#f39c12', '#f1c40f']
        }
    };

    // 如果选中了省份，动态调整颜色范围
    if (selectedProvinceName && provinceData[selectedProvinceName]) {
        const selectedData = provinceData[selectedProvinceName];
        const selectedValue = mode === 'population' ? selectedData.population :
            mode === 'gdp' ? selectedData.gdp :
                mode === 'gdpPerCapita' ? selectedData.gdpPerCapita : selectedData.area;

        // 以选中省份的值为中心点，调整范围
        const factor = 2; // 范围倍数
        colorRanges[mode].min = 0;
        colorRanges[mode].max = Math.round(selectedValue * factor);

        // 根据模式调整颜色方案，使选中值附近的颜色更明显
        if (mode === 'population') {
            colorRanges[mode].colors = ['#0d1b2a', '#1b263b', '#415a77', '#e74c3c', '#ff6b6b'];
        } else if (mode === 'gdp') {
            colorRanges[mode].colors = ['#0d1b2a', '#1b4332', '#40916c', '#52b788', '#95d5b2'];
        } else if (mode === 'gdpPerCapita') {
            colorRanges[mode].colors = ['#0d1b2a', '#1b3a4b', '#f39c12', '#f1c40f', '#ffeaa7'];
        } else {
            colorRanges[mode].colors = ['#0d1b2a', '#2d1b4e', '#5a189a', '#9d4edd', '#c77dff'];
        }
    }

    const units = {
        population: '万人',
        gdp: '亿元',
        area: '平方公里',
        gdpPerCapita: '元'
    };

    const titles = {
        population: '人口分布',
        gdp: 'GDP分布',
        area: '面积分布',
        gdpPerCapita: '人均GDP分布'
    };

    // 如果有选中省份，修改标题
    let titleText = titles[mode];
    let subtitleText = '数据来源：国家统计局 2022年';
    if (selectedProvinceName) {
        subtitleText = `以 ${selectedProvinceName} 为参照基准`;
    }

    return {
        backgroundColor: 'transparent',
        title: {
            text: titleText,
            subtext: subtitleText,
            left: 20,
            top: 20,
            textStyle: {
                color: '#ffffff',
                fontSize: 18,
                fontWeight: 'bold'
            },
            subtextStyle: {
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: 12
            }
        },
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(20, 20, 30, 0.95)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: [12, 16],
            textStyle: {
                color: '#ffffff'
            },
            formatter: (params) => {
                const data = provinceData[params.name];
                if (data) {
                    return `
                        <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">
                            ${params.name} <span style="color: rgba(255,255,255,0.5); font-size: 12px;">${data.pinyin}</span>
                        </div>
                        <div style="color: rgba(255,255,255,0.7); font-size: 13px;">
                            <div style="margin: 4px 0;">👥 人口：${formatNumber(data.population)} 万人</div>
                            <div style="margin: 4px 0;">💰 GDP：${formatNumber(data.gdp)} 亿元</div>
                            <div style="margin: 4px 0;">📐 面积：${formatNumber(data.area)} km²</div>
                        </div>
                        <div style="color: #e74c3c; font-size: 12px; margin-top: 8px;">
                            点击查看详情 →
                        </div>
                    `;
                }
                return params.name;
            }
        },
        visualMap: {
            type: 'continuous',
            min: colorRanges[mode].min,
            max: colorRanges[mode].max,
            left: 20,
            bottom: 20,
            text: ['高', '低'],
            textStyle: {
                color: '#ffffff'
            },
            calculable: true,
            inRange: {
                color: colorRanges[mode].colors
            },
            formatter: (value) => {
                if (mode === 'population') {
                    return Math.round(value) + '万';
                } else if (mode === 'gdp') {
                    return Math.round(value) + '亿';
                } else if (mode === 'gdpPerCapita') {
                    return Math.round(value / 10000) + '万元';
                } else {
                    return Math.round(value / 10000) + '万km²';
                }
            }
        },
        geo: {
            map: 'china',
            roam: true,
            zoom: zoomLevel,
            scaleLimit: {
                min: 0.8,
                max: 6
            },
            label: {
                show: true,
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: 10
            },
            emphasis: {
                label: {
                    show: true,
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 'bold'
                },
                itemStyle: {
                    areaColor: '#e74c3c',
                    shadowBlur: 20,
                    shadowColor: 'rgba(231, 76, 60, 0.5)'
                }
            },
            itemStyle: {
                areaColor: '#1a1a2e',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1
            },
            select: {
                label: {
                    show: true,
                    color: '#ffffff'
                },
                itemStyle: {
                    areaColor: '#c0392b'
                }
            }
        },
        series: [{
            name: titles[mode],
            type: 'map',
            map: 'china',
            geoIndex: 0,
            data: dataMap[mode]
        }]
    };
}

// 初始化控制按钮
function initControls() {
    // 重置按钮
    document.getElementById('btn-reset').addEventListener('click', () => {
        zoomLevel = 1;
        currentProvince = null;
        mapChart.setOption(getMapOption(currentMode));
        resetInfoPanel();
        // 清除 clickable-stat 的 active 状态
        document.querySelectorAll('.clickable-stat').forEach(s => s.classList.remove('active'));
    });

    // 放大按钮
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
        zoomLevel = Math.min(zoomLevel * 1.5, 6);
        updateZoom();
    });

    // 缩小按钮
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
        zoomLevel = Math.max(zoomLevel / 1.5, 0.8);
        updateZoom();
    });

    // 模式切换按钮（底部）
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchMode(btn.dataset.mode);
        });
    });

    // 右侧信息面板可点击的统计项
    document.querySelectorAll('.clickable-stat').forEach(stat => {
        stat.addEventListener('click', () => {
            const mode = stat.dataset.mode;
            switchMode(mode);

            // 为当前点击项添加 active 样式
            document.querySelectorAll('.clickable-stat').forEach(s => s.classList.remove('active'));
            stat.classList.add('active');
        });
    });
}

// 切换地图显示模式
function switchMode(mode) {
    // 支持的模式
    const validModes = ['population', 'gdp', 'area', 'gdpPerCapita'];
    if (!validModes.includes(mode)) return;

    currentMode = mode;

    // 更新底部模式按钮状态
    document.querySelectorAll('.mode-btn').forEach(b => {
        b.classList.remove('active');
        if (b.dataset.mode === mode) {
            b.classList.add('active');
        }
    });

    // 更新地图
    mapChart.setOption(getMapOption(currentMode, currentProvince), {
        notMerge: false,
        lazyUpdate: false
    });
}

// 更新缩放
function updateZoom() {
    mapChart.setOption({
        geo: {
            zoom: zoomLevel
        }
    });
}

// 处理省份点击
function handleProvinceClick(name) {
    currentProvince = name;
    const data = provinceData[name];

    if (data) {
        updateInfoPanel(name, data);
        updateComparisonChart(name);

        // 根据选中省份动态更新地图颜色
        mapChart.setOption(getMapOption(currentMode, name), {
            notMerge: false,
            lazyUpdate: false
        });

        // 高亮选中省份
        mapChart.dispatchAction({
            type: 'select',
            seriesIndex: 0,
            name: name
        });
    }
}

// 更新信息面板
function updateInfoPanel(name, data) {
    elements.provinceName.textContent = name;
    elements.provincePinyin.textContent = data.pinyin;
    elements.adminLevel.textContent = data.adminLevel;
    elements.capital.textContent = data.capital;
    elements.population.textContent = formatNumber(data.population) + ' 万人';
    elements.area.textContent = formatNumber(data.area) + ' km²';
    elements.gdp.textContent = formatNumber(data.gdp) + ' 亿元';
    elements.gdpPerCapita.textContent = formatNumber(data.gdpPerCapita) + ' 元';
    elements.cuisine.textContent = data.cuisine;
    elements.attractions.textContent = data.attractions;
    elements.description.textContent = data.description;

    // 添加动画效果
    document.querySelectorAll('.info-card').forEach((card, index) => {
        card.style.animation = 'none';
        card.offsetHeight; // 触发重排
        card.style.animation = `fadeIn 0.5s ease forwards ${index * 0.1}s`;
    });
}

// 重置信息面板
function resetInfoPanel() {
    elements.provinceName.textContent = '全国概览';
    elements.provincePinyin.textContent = '';
    elements.adminLevel.textContent = '-';
    elements.capital.textContent = '-';
    elements.population.textContent = '-';
    elements.area.textContent = '-';
    elements.gdp.textContent = '-';
    elements.gdpPerCapita.textContent = '-';
    elements.cuisine.textContent = '-';
    elements.attractions.textContent = '-';
    elements.description.textContent = '-';

    updateComparisonChart(null);
}

// 初始化对比图表
function initComparisonChart() {
    comparisonChart = echarts.init(elements.comparisonChart);
    updateComparisonChart(null);
}

// 更新对比图表
function updateComparisonChart(selectedProvince) {
    // 获取排名前5的数据
    const sortedData = [...populationData].sort((a, b) => b.value - a.value).slice(0, 5);

    // 如果选中的省份不在前5，添加它
    if (selectedProvince && !sortedData.find(d => d.name === selectedProvince)) {
        const selectedData = populationData.find(d => d.name === selectedProvince);
        if (selectedData) {
            sortedData.pop();
            sortedData.push(selectedData);
        }
    }

    const option = {
        backgroundColor: 'transparent',
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: '10%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            axisLine: {
                lineStyle: { color: 'rgba(255,255,255,0.1)' }
            },
            axisLabel: {
                color: 'rgba(255,255,255,0.5)',
                fontSize: 10,
                formatter: (value) => (value / 1000) + 'k'
            },
            splitLine: {
                lineStyle: { color: 'rgba(255,255,255,0.05)' }
            }
        },
        yAxis: {
            type: 'category',
            data: sortedData.map(d => d.name).reverse(),
            axisLine: {
                lineStyle: { color: 'rgba(255,255,255,0.1)' }
            },
            axisLabel: {
                color: 'rgba(255,255,255,0.8)',
                fontSize: 11
            }
        },
        series: [{
            type: 'bar',
            data: sortedData.map(d => ({
                value: d.value,
                itemStyle: {
                    color: d.name === selectedProvince
                        ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                            { offset: 0, color: '#e74c3c' },
                            { offset: 1, color: '#c0392b' }
                        ])
                        : new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                            { offset: 0, color: 'rgba(231, 76, 60, 0.3)' },
                            { offset: 1, color: 'rgba(231, 76, 60, 0.6)' }
                        ])
                }
            })).reverse(),
            barWidth: '60%',
            label: {
                show: true,
                position: 'right',
                color: 'rgba(255,255,255,0.7)',
                fontSize: 10,
                formatter: (params) => formatNumber(params.value) + '万'
            }
        }]
    };

    comparisonChart.setOption(option);
}

// 隐藏加载动画
function hideLoading() {
    setTimeout(() => {
        elements.loading.classList.add('hidden');
    }, 500);
}

// 格式化数字
function formatNumber(num) {
    if (num === undefined || num === null) return '-';
    return num.toLocaleString('zh-CN', { maximumFractionDigits: 1 });
}
