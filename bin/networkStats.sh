#/bin/bash

Interfaces=`ifconfig -a \
    | grep -o -e "[a-z][a-z]*[0-9]*[ ]*Link" \
    | cut -d " " -f1`

for Interface in $Interfaces; do
    if [ "$Interface" == "lo" ]; then
        continue
    fi

    INET=`ifconfig $Interface | grep -o -e "inet addr:[^ ]*" | grep -o -e "[^:]*$"`
    MASK=`ifconfig $Interface | grep -o -e "Mask:[^ ]*"      | grep -o -e "[^:]*$"`
    STATUS="up"
    MAC=`ifconfig $Interface | awk '/HWaddr/ {print $5}'`
    MTU=`ifconfig $Interface | grep -Eo "MTU:[0-9]+" | cut -d ":" -f2`

    RX=`ifconfig $Interface | grep -oP '(?<=RX bytes:)[0-9]*'`
    TX=`ifconfig $Interface | grep -oP '(?<=TX bytes:)[0-9]*'`

    RXPK=`ifconfig $Interface | grep -oP '(?<=RX packets:)[0-9]*'`
    TXPK=`ifconfig $Interface | grep -oP '(?<=TX packets:)[0-9]*'`

    RX_DROP=`ifconfig $Interface | grep "RX packets:" | grep -oP '(?<=dropped:)[0-9]*'`
    TX_DROP=`ifconfig $Interface | grep "TX packets:" | grep -oP '(?<=dropped:)[0-9]*'`

    RX_ERR=`ifconfig $Interface | grep "RX packets:" | grep -oP '(?<=errors:)[0-9]*'`
    TX_ERR=`ifconfig $Interface | grep "TX packets:" | grep -oP '(?<=errors:)[0-9]*'`

    if [ "$INET" == "" ]; then
        STATUS="DOWN"
        MTU=0
	INET=0
	MASK=0
	RX=0
	TX=0
	RX_DROP=0
	TX_DROP=0
	RX_ERR=0
	TX_ERR=0
	RXPK=0
	TXPK=0
    fi

    echo $Interface"|"$MTU"|"$INET"|"$MASK"|"$STATUS"|"$MAC"|"$RX"|"$TX"|"$RX_DROP"|"$TX_DROP"|"$RX_ERR"|"$TX_ERR"|"$RXPK"|"$TXPK
done
