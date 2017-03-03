'use strict'
var exec = require('child_process').exec;
//https://www.npmjs.com/package/microstats
var socket = require('socket.io-client')('http://163.172.38.81:9998');
var si = require('systeminformation');
var os = require('os');
var fs = require('fs');
var exec = require('child_process').exec;
var microstats = require('microstats');
var moment = require('moment');


var _local = {};
var AutoUpdater = require('auto-updater');
var autoupdater = new AutoUpdater({
    pathToJson: '',
    autoupdate: false,
    checkgit: false,
    jsonhost: 'raw.githubusercontent.com',
    contenthost: 'codeload.github.com',
    progressDebounce: 0,
    devmode: true
});

_local.netCards = [];
_local.services = [];


fs.readFile('/var/lib/node_agent/key.config', 'utf8', function (err,data) {
    if(err) return console.log(err);
    var hash = data.trim();

    socket.on('connect', function(){
        socket.emit("message","ok");
    });
    socket.on('service_list',function(data) { _local.services = data; });

    socket.on('event', function(data){
        if(data == "request_hash") {
            socket.emit('hash',hash);
        }
        if(data == "bad_hash") {
            console.log("Error, your hash was not valid");
            socket.disconnect()
        }
        if(data == "connection_ok") {
            console.log("You are connected to the collector");

            /*
            setInterval(sendServerData, (1000*60*24));
            sendServerData();
            setInterval(sendMemory, 20000);
            sendMemory
            setInterval(sendCpu, 5000);
            sendCpu
            setInterval(sendDisksio, 5000);
            sendDisksio
            setInterval(sendFsSize, 25000);
            sendFsSize();
            setInterval(sendNetworkCon, 3000);
            sendNetworkCon*/

            setInterval(sendFsSize, 30000);
            sendFsSize();

            setInterval(sendMemory, 20000);
            sendMemory

            setInterval(sendNetworkStats, 5000);
            sendNetworkStats

            setInterval(sendFsstats, 10000);
            sendFsstats

            setInterval(sendServiceCheck, (1000)*20);
            sendServiceCheck
            /*setInterval(sendPingService, 5000);
            sendPingService
            setInterval(sendServiceCheck, (1000)*10);
            sendServiceCheck*/
        }



    });
    socket.on('disconnect', function(){
        console.log("Disconnected from the socket !");
    });



    var _local = {};
    _local.netCards = [];
    _local.services = [];
    _local.data = {
        cpuload: null,
        mem_total: null,
        mem_used: null,
        users: [],
        process: [],
        network_rx_sec: null,
        network_tx_sec: null,
        diskspace_used: null,
        diskspace_total: null,
        storage: null
    };




    var http = require('http');
    var fs = require('fs');

    var server = http.createServer(function(req, res) {
    });

    var io = require('socket.io').listen(server);
    io.sockets.on('connection', function (socket) {

    });


    setInterval(retrieveData, 2500);
    setInterval(function() {
        io.sockets.emit("new_data",_local.data);
    },1000);

    server.listen(11687);


    function sendToWs(data,action) {
        var utcMoment = moment();
        var utcDate = new Date( utcMoment.format() );
        var json = {query:data,timestamp: new Date().getTime(), date: utcDate, hash:hash};
        var json = JSON.stringify(json);
        socket.emit('data_'+action,json);
    }




    function sendPingService() {
        var _hosts = ["google.com"];
        for(var i=0;i<_hosts.length;i++) {
            si.inetLatency(_hosts[i], function (d) {
                sendToWs({ host: "google.com", ms: d}, "pingservice");
            });
        }
    }

    function sendNetworkStats() {
        exec("/bin/bash bin/networkStats.sh", function (err,data) {
            var result = data.trim().split("\n");
            var json = [];
            for(var i=0;i<result.length;i++) {
                var _tmp = result[i].split("|");

                //$Interface"|"$MTU"|"$INET"|"$MASK"|"$STATUS"|"$MAC"|"$RX"|"$TX"|"$RX_DROP"|"$TX_DROP"|"$RX_ERR"|"$TX_ERR
                json.push({ iface: _tmp[0], mtu: _tmp[1], mask: _tmp[2], status: _tmp[4], mac: _tmp[5], rx: _tmp[6], tx: _tmp[7], rx_drop: _tmp[8], tx_drop: _tmp[9], rx_err: _tmp[10], tx_err: _tmp[11], rxp: _tmp[12], txp: _tmp[13] })

            }
            sendToWs(json, "networkstats");
        });
    }//

//
    function sendServiceCheck() {
        if(typeof _local.services != "undefined" && _local.services.length > 0) {
            si.services(_local.services, function (d) {
                sendToWs(d, "servicecheck");
            });
        }
    }


    function sendNetworkCon() {
        si.fsStats(function (d) {
            sendToWs(d, "networkconnections");
        });
    }

    function sendFsSize() {
        si.fsSize(function(d) { sendToWs(d, "fssize")})
    }

    function sendFsstats() {
        si.fsStats(function (d) {
            sendToWs(d, "fsstats");
        });
    }

    function sendDisksio() {
        si.disksIO(function (d) {
            if(d.rIO_sec >= 0) {
                sendToWs(d, "disksio");
            }
        });
    }

    function sendCpu() {
        si.currentLoad(function (d) {
            sendToWs(d, "cpuload");
        });
    }
    function sendMemory() {

        exec("cat /proc/meminfo | grep 'Cached:' | awk '{print $2}'",function(err,data) {
            data = data.trim().split("\n");
            var cached = data[0];

            si.mem(function (d) {
                d.cached = cached;
                sendToWs(d, "memory");
            });

        })


    }
    function sendServerData() {
        var server_data = {};
        si.networkInterfaces(function (d) {
            server_data.networks = JSON.stringify(d);
            _local.netCards = d;
            si.system(function (d) {
                server_data.system = JSON.stringify(d);
                si.osInfo(function (d) {
                    server_data.os = JSON.stringify(d);
                    si.cpu(function (d) {
                        server_data.cpus = JSON.stringify(d);
                        si.mem(function (d) {
                            server_data.total_mem = d.total;
                            var _date = new Date();
                            _date.setSeconds(parseInt(_date.getSeconds()-(os.uptime())));
                            server_data.uptime = _date;
                            sendToWs(server_data,"server");
                        });
                    });
                });
            });
        });
    }
    function retrieveData() {
        si.users(function (d) {
            _local.data.users = d;
        });
        si.processes(function (d) {
            _local.data.process = d;
        });
        si.mem(function (d) {
            _local.data.mem_used = d.used;
            _local.data.mem_total = d.total;
            _local.data.mem_available = d.available;
        });

        si.currentLoad(function (d) {
            _local.data.cpuload = d.currentload;
        });

        si.fsSize(function(d) {
            var tmpused = 0; var tmptotal = 0; var percent = 0;
            for(var i=0;i < d.length; i++) {
                tmpused += d[i].used; tmptotal += d[i].size;
                if(i == (d.length-1)) {
                    _local.data.storage = Math.floor(tmpused/tmptotal*100);
                }
            }
        });
    }

    function checkUpdates() {
        autoupdater.fire('check');
    }
    checkUpdates();
    setTimeout(checkUpdates, 1000*60*10)

});


