import { useRef, useCallback, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { WebView } from "react-native-webview";
import { COLORS } from "@/src/theme";

export type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type Props = {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  name: string;
  description: string;
  prefill: { name: string; contact: string; email: string };
  onSuccess: (payload: RazorpaySuccessPayload) => void;
  onFailure: (msg: string) => void;
  onDismiss: () => void;
};

export default function RazorpayWebView({ keyId, razorpayOrderId, amount, name, description, prefill, onSuccess, onFailure, onDismiss }: Props) {
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <style>
        body { margin: 0; padding: 0; background: #0A0A0A; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
        .spinner { border: 3px solid rgba(212,175,55,0.3); border-top: 3px solid #D4AF37; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="spinner" id="loader"></div>
      <script>
        var options = {
          key: "${keyId}",
          amount: ${amount},
          currency: "INR",
          name: "${name}",
          description: "${description}",
          order_id: "${razorpayOrderId}",
          prefill: { name: "${prefill.name}", contact: "${prefill.contact}", email: "${prefill.email}" },
          theme: { color: "#D4AF37" },
          handler: function(response) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: "success", ...response }));
          },
          modal: {
            ondismiss: function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: "dismiss" }));
            }
          }
        };
        var rzp = new Razorpay(options);
        rzp.on("payment.failed", function(resp) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: "failure", error: resp.error.description }));
        });
        window.addEventListener("load", function() {
          document.getElementById("loader").style.display = "none";
          rzp.open();
        });
      </script>
    </body>
    </html>
  `;

  const onMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "success") {
        onSuccess({ razorpay_payment_id: data.razorpay_payment_id, razorpay_order_id: data.razorpay_order_id, razorpay_signature: data.razorpay_signature });
      } else if (data.type === "failure") {
        onFailure(data.error || "Payment failed");
      } else if (data.type === "dismiss") {
        onDismiss();
      }
    } catch {}
  }, [onSuccess, onFailure, onDismiss]);

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loaderTxt}>Loading payment…</Text>
        </View>
      ) : null}
      <WebView
        ref={webRef}
        source={{ html }}
        onMessage={onMessage}
        onLoad={() => setLoading(false)}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  webview: { flex: 1, backgroundColor: "transparent" },
  loader: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.black, gap: 12 },
  loaderTxt: { color: COLORS.gold, fontWeight: "700" },
});
