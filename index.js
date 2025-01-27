const express = require('express');
const fileUpload = require('express-fileupload');
const cv = require('opencv'); // Ensure you installed opencv
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(fileUpload());
app.use(express.static('public'));

app.post('/upload', (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    const imageFile = req.files.image;
    const uploadPath = path.join(__dirname, 'uploads', imageFile.name);

    imageFile.mv(uploadPath, (err) => {
        if (err) {
            return res.status(500).send(err);
        }

        // Process the image using OpenCV
        cv.readImage(uploadPath, (err, img) => {
            if (err) {
                return res.status(500).send(err);
            }

            // Convert to HSV and invert
            const hsv = img.copy();
            hsv.convertHSVscale();
            const invertedHsv = hsv.copy();
            invertedHsv.addWeighted(hsv, -1, 255);

            // Convert back to BGR and compute difference
            const invertedImg = invertedHsv.copy();
            invertedImg.convertHSVscale(true);
            const diff = img.absDiff(invertedImg);

            // Edge detection on difference image
            const grayDiff = diff.copy();
            grayDiff.convertGrayscale();
            const edges = grayDiff.copy();
            edges.canny(100, 200);

            // Combine original image with detected edges
            const result = img.copy();
            result.bitwiseAnd(result, edges);

            // Save the processed image
            const resultPath = path.join(__dirname, 'public', 'result.png');
            result.save(resultPath);

            res.sendFile(resultPath, err => {
                if (err) {
                    res.status(500).send(err);
                }

                // Clean up the uploaded file
                fs.unlink(uploadPath, unlinkErr => {
                    if (unlinkErr) {
                        console.error('Error cleaning up uploaded file:', unlinkErr);
                    }
                });
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
