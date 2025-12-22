package com.V_Beat.util;

public class Util {
    public static String jsReplace(String msg, String uri) {

        if (msg == null) {
            msg = "";
        }

        if (uri == null || uri.length() == 0) {
            uri = "/";
        }

        return String.format("""
            <script>
                const msg = '%s'.trim();
                
                if (msg.length > 0) {
                    alert(msg);
                }
                
                const uri = '%s'.trim();
                
                if (uri == 'hb') {
                    history.back();
                } else {
                    location.replace(uri);
                }
            </script>
            """, msg, uri);
    }
}