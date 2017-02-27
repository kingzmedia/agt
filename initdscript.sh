#!/bin/bash

NAME=node_agent
SOURCE_DIR=/var/lib/node_agent
SOURCE_NAME=agent.js
COMMAND=node

USER=root
NODE_ENVIRONMENT=production

pidfile=/var/log/$NAME.pid
logfile=/var/log/$NAME.log
forever_dir=/var/run/forever

forever=forever
node=node
sed=sed

start() {
    export NODE_ENV=$NODE_ENVIRONMENT
    echo "Starting $NAME node instance : "

    if [ "$foreverid" == "" ]; then
        touch $logfile
        chown $USER $logfile

        touch $pidfile
        chown $USER $pidfile

        $forever start -p $forever_dir --pidFile $pidfile -l $logfile \
            -a --sourceDir $SOURCE_DIR -w $SOURCE_NAME -c $COMMAND $SOURCE_NAME
        RETVAL=$?
    else
        echo "Instance already running"
        RETVAL=0
    fi
}

restart() {
    stop
    start
}

stop() {
    echo -n "Shutting down $NAME node instance : "
    if [ "$foreverid" != "" ]; then
        cd $SOURCE_DIR && $forever stop $pid
    else
        echo "Instance is not running";
    fi
    RETVAL=$?
}

status() {
    $forever list
}

if [ -f $pidfile ]; then
    read pid < $pidfile
else
    pid=""
fi

if [ "$pid" != "" ]; then
    sed1="/$pid/p"
    foreverid=`$forever list -p $forever_dir | $sed -n $sed1`
else
    foreverid=""
fi

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    status)
        status
        ;;
    restart)
        restart
        ;;
    *)
        echo "Usage:  {start|stop|status|restart}"
        exit 1
        ;;
esac
exit $RETVAL