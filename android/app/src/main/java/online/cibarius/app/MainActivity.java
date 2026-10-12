package online.cibarius.app;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // I plugin locali vanno registrati prima che parta il bridge.
        registerPlugin(StampaPlugin.class);
        registerPlugin(SalvaPlugin.class);
        super.onCreate(savedInstanceState);

        // Senza questo il tasto indietro chiude l'app da qualsiasi pagina.
        // Decide la pagina (src/lib/native-back.ts): chiude la sheet aperta o
        // torna alla pagina prima; dalla home risponde false e l'app va in
        // secondo piano, come le altre app Android.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                bridge.getWebView().evaluateJavascript("window.cibariusIndietro?.() === true", gestito -> {
                    if (!"true".equals(gestito)) moveTaskToBack(true);
                });
            }
        });
    }
}
