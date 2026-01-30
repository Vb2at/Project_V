package com.V_Beat.util;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

public class ImageDownloader {
    public static String downloadProfileImg(String imageUrl, String destDir) throws Exception {
        URL url = new URL(imageUrl);
        String filename = UUID.randomUUID().toString() + ".jpg";

        Path targetPath = Path.of(destDir, filename);
        Files.createDirectories(targetPath.getParent());

        try (InputStream in = url.openStream();
             FileOutputStream fos = new FileOutputStream(targetPath.toFile())) {
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                fos.write(buffer, 0, bytesRead);
            }
        }

        return filename;
    }
}