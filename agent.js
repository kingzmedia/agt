'use strict';
var socket = require('socket.io-client')('http://163.172.38.81:9998');
var si = require('systeminformation');
var os = require('os');
var fs = require('fs');
var _local = {};
_local.netCards = [];
_local.services = [];

var hash = "";

fs.readFile('/var/lib/node_agent/key.config', 'utf8', function (err,data) {
    if(err) return console.log(err);
    hash = data;

    socket.on('connect', function(){
        socket.emit("message","ok");
    });
    socket.on('service_list',function(data) { _local.services = JSON.parse(data); });

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

            setInterval(sendServerData, (1000*60*24));
            sendServerData();
            setInterval(sendMemory, 15000);
            sendMemory
            setInterval(sendCpu, 10000);
            sendCpu
            setInterval(sendDisksio, 15000);
            sendDisksio
            setInterval(sendFsstats, 15000);
            sendFsstats
            setInterval(sendFsSize, 60000*60);
            sendFsSize();
            setInterval(sendNetworkCon, (1000)*50);
            sendNetworkCon
            setInterval(sendNetworkStats, (10000));
            sendNetworkStats
            setInterval(sendPingService, (1000)*30);
            sendPingService
            setInterval(sendServiceCheck, (1000)*20);
            sendServiceCheck
        }



    });
    socket.on('disconnect', function(){
        console.log("Disconnected from the socket !");
    });



    var _local = {};
    _local.netCards = [];
    _local.services = [];
    _local.data = { cpuload: null, mem_total: null, mem_used: null, users: [], process: [], network_rx_sec: null, network_tx_sec: null, diskspace_used: null, diskspace_total: null, storage : null };




    var http = require('http');
    var fs = require('fs');

    var server = http.createServer(function(req, res) {
    });

    var io = require('socket.io').listen(server);
    io.sockets.on('connection', function (socket) {

    });


    setInterval(retrieveData, 1000);
    setInterval(function() {
        io.sockets.emit("new_data",_local.data);
    },1000);

    server.listen(11687);

});



function sendToWs(data,action) {
    var json = {query:data,timestamp: new Date().getTime(), date: new Date(), hash:hash};
    var json = JSON.stringify(json);
    socket.emit('data_'+action,json);
}




function sendPingService() {
    var _hosts = ["google.com","bing.com","ovh.com"];
    for(var i=0;i<_hosts.length;i++) {
        si.inetLatency(_hosts[i], function (d) {
            sendToWs({host:_hosts[i], ms: d}, "pingservice");
        });
    }
}

function sendNetworkStats() {
    if(_local.netCards != null) {
        var tmp = [];
        for (var i=0;i<_local.netCards.length;i++) {
            if(typeof _local.netCards[i].iface != "undefined") {
                si.networkStats(_local.netCards[i].iface, function (d) {
                    if(d.rx_sec >=0) {
                        sendToWs(d, "networkstats");
                    }
                });
            }
        }

    }
}


function sendServiceCheck() {
    if(typeof _local.services.length > 0) {
        si.inetLatency(_local.services, function (d) {
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
        if(d.rx_sec >= 0) {
            sendToWs(d, "fsstats");
        }
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
    si.mem(function (d) {
        sendToWs(d, "memory");
    });
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
    });

    si.currentLoad(function (d) {
        _local.data.cpuload = d.currentload;
    });
    si.networkStats(function (d) {
        _local.data.network_rx_sec = d.rx_sec;
        _local.data.network_tx_sec = d.tx_sec;
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