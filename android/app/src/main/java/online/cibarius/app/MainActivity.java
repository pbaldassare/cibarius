package online.cibarius.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // I plugin locali vanno registrati prima che parta il bridge.
        registerPlugin(StampaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
