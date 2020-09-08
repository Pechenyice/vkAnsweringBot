window.onload = () => {
    var modes = {};

    const preloaderInner = '<div class="preloader" id="onLoadPreloader">    <div class="preloaderLogo">VK Helper</div><div class="preloaderContent"><div class="circle"></div><div class="circle"></div><div class="circle"></div></div></div>';

    socket = io.connect('localhost:8080');
    var clientsBlock = document.getElementById('clientsShowBlockBack');
    var clientsAddBlock = document.getElementById('addUserShowBlockBack');

    // document.getElementById('clientsShowBlockClose').addEventListener('click', () => {
    //     clientsBlock.style.display = 'none';
    // });

    // document.getElementById('clientsSettingsBlock').addEventListener('click', () => {
    //     clientsBlock.style.display = 'block';
    // });

    socket.on('connect', () => {
        socket.on('getClients', (data)=> {
            document.getElementById('clientsShowBlockContent').innerHTML = '';
            // console.log(data);
            for (elem in data) {
                var div = document.createElement('div');
                div.className = 'clientsShowBlockClient';
                div.setAttribute('id', elem);
                div.innerHTML = '<img class="clientsShowBlockClientImg" src="' + data[elem].photo_200 + '" />';
                div.innerHTML += '<div class="clientsShowBlockClientName">' + data[elem].first_name + ' ' + data[elem].last_name + '</div>';
                div.innerHTML += '<div class="clientsShowBlockClientId">id: ' + elem + '</div>';
                div.innerHTML += '<div class="clientsShowBlockClientModes"><div class="clientsShowBlockClientModesModeBlock"><div class="clientsShowBlockClientModesMode" id="ttsRootsMode'+elem+'"><i class="fas fa-unlock-alt"></i></div><p>tts access</p></div><div class="clientsShowBlockClientModesModeBlock"><div class="clientsShowBlockClientModesMode" id="ttsMode'+elem+'"><i class="fas fa-microphone"></i></div><p>tts</p></div><div class="clientsShowBlockClientModesModeBlock"><div class="clientsShowBlockClientModesMode" id="jokesMode'+elem+'"><i class="far fa-grin-squint"></i></div><p>jokes</p></div><div class="clientsShowBlockClientModesModeBlock"><div class="clientsShowBlockClientModesMode" id="randMode'+elem+'"><i class="fas fa-dice"></i></div><p>random</p></div></div>'
                document.getElementById('clientsShowBlockContent').append(div);
            }
            socket.emit('getModes', {});
        });

        socket.on('getModes', (data)=> {
            for (elem of document.getElementsByClassName('clientsShowBlockClient')) {
                var id = elem.getAttribute('id');
                modes = data;
                // console.log(modes);

                if (data[id]['ttsRoots']) {
                    document.getElementById('ttsRootsMode'+id).parentNode.classList.toggle('activeModeBlock');
                }
                setModeListener(id, 'ttsRootsMode'+id, 'ttsRoots');

                if (data[id]['tts']) {
                    document.getElementById('ttsMode'+id).parentNode.classList.toggle('activeModeBlock');
                }
                setModeListener(id, 'ttsMode'+id, 'tts');

                if (data[id]['jokes']) {
                    document.getElementById('jokesMode'+id).parentNode.classList.toggle('activeModeBlock');
                }
                setModeListener(id, 'jokesMode'+id, 'jokes');

                if (data[id]['rand']) {
                    document.getElementById('randMode'+id).parentNode.classList.toggle('activeModeBlock');
                }
                setModeListener(id, 'randMode'+id, 'rand');
            }
        });

        socket.on('setModes', (data)=> {
            for (elem of document.getElementsByClassName('clientsShowBlockClient')) {
                var id = elem.getAttribute('id');
                if (data[id]['tts'] != modes[id]['tts']) {
                    document.getElementById('ttsMode'+id).parentNode.classList.toggle('activeModeBlock');
                }
                if (data[id]['jokes'] != modes[id]['jokes']) {
                    document.getElementById('jokesMode'+id).parentNode.classList.toggle('activeModeBlock');
                }
            }
            modes = data;
        });

        document.getElementById('clientsShowBlockClose').addEventListener('click', () => {
            clientsBlock.style.display = 'none';
            document.getElementById('clientsShowBlockContent').innerHTML = '';
        });
    
        document.getElementById('clientsSettingsBlockContent').addEventListener('click', () => {
            clientsBlock.style.display = 'block';
            
            socket.emit('getClients', {});
            var div = document.createElement('div');
            div.innerHTML = preloaderInner;
            document.getElementById('clientsShowBlockContent').append(div);
        });

        document.getElementById('addUserShowBlockClose').addEventListener('click', () => {
            clientsAddBlock.style.display = 'none';
            document.getElementById('addUserShowBlockContent').innerHTML = '';
        });

        document.getElementById('addUserInputSubmit').addEventListener('click', ()=> {
            var data = {};
            if (document.getElementById('addUserInput').value) {
                data['query'] = document.getElementById('addUserInput').value;
                socket.emit('addNewClient', data);
            }

            document.getElementById('addUserShowBlockBack').style.display = 'block';
            var div = document.createElement('div');
            div.innerHTML = preloaderInner;
            document.getElementById('addUserShowBlockContent').append(div);
        });

        function setModeListener(id, nodeId, offset) {
            document.getElementById(nodeId).addEventListener('click', () => {
                document.getElementById(nodeId).parentNode.classList.toggle('activeModeBlock');
                modes[id][offset] = !modes[id][offset];
                socket.emit('setModes', modes);
            });
        }

        var initInputs = document.getElementsByClassName('botInitParamInput');

        for (var item of initInputs) {
            inputAnimator(item);
        }

        document.getElementById('botAutoAnsweringSwitcherOff').addEventListener('click', () => {
            for (var item of document.getElementsByClassName("botAutoAnsweringContentDecor")) {
                item.style.backgroundColor = '#606060';
            }
        });

        document.getElementById('botAutoAnsweringSwitcherOn').addEventListener('click', () => {
            for (var item of document.getElementsByClassName("botAutoAnsweringContentDecor")) {
                item.style.backgroundColor = '#ec51ff';
            }
        });

        charts();
    });
}

function inputAnimator(item) {

    var lastInputValue;
    
    item.onfocus = () => {
        item.style.width = '90%';
        item.style.borderBottom = '2px solid white';
        item.style.color = '#ec51ff';
        lastInputValue = item.value;
    };

    item.onblur = () => {
        item.style.width = '80%';
        item.style.borderBottom = '2px solid rgb(60,60,60)';
        item.style.color = 'white';
        if (!item.value) item.value = lastInputValue;
    };
}

function charts() {
    Chart.defaults.global.defaultFontColor = "white";
    Chart.defaults.global.defaultFontFamily = 'Odibee Sans';
    // Chart.defaults.global.defaultFontSize = '18';
    enterChart([2, 3, 4, 7, 8, 9, 3]);
    clientsChart([6, 14]);
    messagesChart([[12,13,24,45,34,23,16],[16,18,36,90,23,10,90]]);
    // messagesChart([[{x:0, y: 12},{x:5, y: 12},{x:10, y: 12},{x:15, y: 12},{x:20, y: 12},{x:25, y: 12},{x:30, y: 12}],[{x:0, y: 12},{x:5, y: 12},{x:10, y: 12},{x:15, y: 12},{x:20, y: 12},{x:25, y: 12},{x:30, y: 12}]]);
    functionsChart([38, 39, 40]); //++++++
}

function enterChart(data) {
    var ctx = document.getElementById('enterChart').getContext('2d');
    var myChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        datasets: [{
                label: 'Logins',
                data: data,
                backgroundColor: [
                    'rgba(128,0,255,.3)',
                    'rgba(189,9,233,.3)',
                    'rgba(236,81,255,.3)',
                    'rgba(128,0,255,.3)',
                    'rgba(189,9,233,.3)',
                    'rgba(236,81,255,.3)',
                    'rgba(128,0,255,.3)'
                ],
                borderColor: [
                    'rgba(128,0,255,1)',
                    'rgba(189,9,233,1)',
                    'rgba(236,81,255,1)',
                    'rgba(128,0,255,1)',
                    'rgba(189,9,233,1)',
                    'rgba(236,81,255,1)',
                    'rgba(128,0,255,1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            legend: {
                display: false,
                labels: {
                    fontColor: 'rgb(255, 255, 255)'
                },
                fontSize: '6'
            },
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true,
                        minor: {
                            fontSize: '14'
                        },
                        fontSize: '14'
                    }
                }],

                xAxes: [{
                    ticks: {
                        minor: {
                            fontSize: '16'
                        },
                        fontSize: '16'
                    }
                }]
            }
        }
    });
}

function clientsChart(data) {
    data[1] = data[1] - data[0];
    var ctx = document.getElementById('clientsChart').getContext('2d');
    var myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['full access', 'partial access'],
            datasets: [{
                    label: 'Clients',
                    data: data,
                    backgroundColor: [
                        'rgba(128,0,255,.3)',
                        'rgba(236,81,255,.3)'
                    ],
                    borderColor: [
                        'rgba(128,0,255,1)',
                        'rgba(236,81,255,1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                legend: {
                    display: true,
                    labels: {
                        fontColor: 'rgb(255, 255, 255)'
                    }
                }
            }
        });
}

function messagesChart(data) {
    var ctx = document.getElementById('messagesChart').getContext('2d');
    var myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['6 days ago', '5 days ago', '4 days ago', '3 days ago', '2 days ago', 'yesterday', 'today'],
            datasets: [{
                    label: 'delivered',
                    data: data[0],
                    backgroundColor: [
                        'rgba(128,0,255,.3)'
                    ],
                    borderColor: [
                        'rgba(128,0,255,1)'
                    ],
                    borderColor: 'rgba(128,0,255,1)',
                    borderWidth: 1
                },
                {
                    label: 'sent',
                    data: data[1],
                    backgroundColor: [
                        'rgba(255,255,255,.3)'
                    ],
                    borderColor: [
                        'rgba(255,255,255,1)'
                    ],
                    borderColor: 'rgba(255,255,255,1)',
                    borderWidth: 1,
                }
            ],
            options: {
                legend: {
                    display: true,
                    labels: {
                        fontColor: 'rgb(255, 255, 255)'
                    }
                },
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero: true,
                            minor: {
                                fontSize: '2'
                            },
                            fontSize: '2'
                        }
                    }],
                    xAxes: [{
                        ticks: {
                            beginAtZero: true,
                            minor: {
                                fontSize: '2'
                            },
                            fontSize: '2'
                        }
                    }]
                }
            }
        }
        });
}

function functionsChart(data) {
    var chartx = document.getElementById('functionsChart').getContext('2d');
    var chart = new Chart(chartx, {
        type: 'radar',
        data: {
            labels: ['/joke', '/beornottobe', '/tts'],
            datasets: [{
                    label: 'usage',
                    data: data,
                    backgroundColor: [
                        'rgba(128,0,255,.3)'
                    ],
                    borderColor: [
                        'rgba(128,0,255,1)'
                    ],
                    borderWidth: 1
                }
            ],
            options: {
                legend: {
                    display: false,
                    labels: {
                        display: false
                    }
                },
                scale: { ticks: {
                    backdropColor: "#202020",
                    display: false
                } }
            }
        }
        });
}