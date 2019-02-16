package com.appc.titanium.socketio;

import org.appcelerator.kroll.KrollProxy;
import org.appcelerator.kroll.annotations.Kroll;
import org.appcelerator.kroll.common.Log;
import org.appcelerator.kroll.common.TiConfig;

import io.socket.client.Manager;
import io.socket.client.Socket;

@Kroll.proxy(creatableInModule=TiSocketioModule.class)
public class SocketManagerProxy extends KrollProxy
{
    // Standard Debugging variables
    private static final String LCAT = "ManagerProxy";
    private static final boolean DBG = TiConfig.LOGD;

    private Manager manager;
    private boolean autoConnect = true;

    public SocketManagerProxy(Manager manager, boolean autoConnect)
    {
        super();

        this.manager = manager;
        this.autoConnect = autoConnect;
    }

    // Methods
    @Kroll.method
    public void open()
    {
        this.manager.open();
    }

    @Kroll.method
    public void connect()
    {
        this.open();
    }

    @Kroll.method
    public void close()
    {
        this.disconnect();
    }

    @Kroll.method
    public void disconnect()
    {
        Log.debug(LCAT, "Closing a manager is not supported by the Android native client. You need to manually close all created sockets.");
    }

    @Kroll.method
    public SocketClientProxy socket(String nsp)
    {
        Socket socket = this.manager.socket(nsp);
        SocketClientProxy socketProxy = new SocketClientProxy(socket, this);
        if (this.autoConnect) {
            socket.connect();
        }

        return socketProxy;
    }
}