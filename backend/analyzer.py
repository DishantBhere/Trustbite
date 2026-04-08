"""
FoodForensics - Core Analysis Module
Detects AI-generated edits in food photography through multiple forensic techniques.
"""

import io
import cv2
import numpy as np
from PIL import Image, ImageChops, ExifTags
from typing import Tuple, Dict, Any, Optional


def analyze_metadata(image: Image.Image) -> Dict[str, Any]:
    """
    Extract and analyze EXIF metadata from an image.
    
    Args:
        image: PIL Image object
        
    Returns:
        Dictionary containing:
        - exif_data: Raw EXIF data (decoded)
        - software: Software used to create/edit
        - risk_level: "High", "Medium", or "Low"
        - flags: List of warning messages
    """
    result = {
        "exif_data": {},
        "software": None,
        "risk_level": "Low",
        "flags": []
    }
    
    # Suspicious software indicators
    suspicious_software = [
        "adobe", "photoshop", "lightroom", "canva", "gimp", 
        "affinity", "pixlr", "snapseed", "vsco", "picsart",
        "midjourney", "dall-e", "stable diffusion", "firefly"
    ]
    
    try:
        exif_data = image._getexif()
        
        if exif_data is None:
            # No EXIF data - common in AI-generated images
            result["risk_level"] = "High"
            result["flags"].append("⚠️ No EXIF metadata found - common in AI-generated images")
            return result
        
        # Decode EXIF tags
        decoded_exif = {}
        for tag_id, value in exif_data.items():
            tag_name = ExifTags.TAGS.get(tag_id, tag_id)
            # Convert bytes to string if necessary
            if isinstance(value, bytes):
                try:
                    value = value.decode('utf-8', errors='ignore')
                except:
                    value = str(value)
            decoded_exif[tag_name] = value
        
        result["exif_data"] = decoded_exif
        
        # Check for software tag
        software = decoded_exif.get("Software", "")
        result["software"] = software
        
        if software:
            software_lower = software.lower()
            for suspicious in suspicious_software:
                if suspicious in software_lower:
                    result["risk_level"] = "High"
                    result["flags"].append(f"⚠️ Image edited with: {software}")
                    break
        
        # Check for missing critical camera data
        critical_fields = ["Make", "Model", "DateTimeOriginal"]
        missing_fields = [f for f in critical_fields if f not in decoded_exif]
        
        if len(missing_fields) >= 2:
            if result["risk_level"] != "High":
                result["risk_level"] = "Medium"
            result["flags"].append(f"⚠️ Missing camera data: {', '.join(missing_fields)}")
        
        # Check for editing timestamps
        if "DateTimeDigitized" in decoded_exif and "DateTimeOriginal" in decoded_exif:
            if decoded_exif["DateTimeDigitized"] != decoded_exif["DateTimeOriginal"]:
                result["flags"].append("ℹ️ Digitized and original timestamps differ")
        
    except Exception as e:
        result["risk_level"] = "High"
        result["flags"].append(f"⚠️ Error reading metadata: {str(e)}")
    
    if not result["flags"]:
        result["flags"].append("✅ Metadata appears normal")
    
    return result


def perform_ela(image: Image.Image, quality: int = 90, scale: int = 20) -> Tuple[Image.Image, float]:
    """
    Perform Error Level Analysis (ELA) on an image.
    
    ELA works by re-saving the image at a known quality level and comparing
    the difference. Areas that have been modified will show different 
    compression artifacts than the original areas.
    
    Args:
        image: PIL Image object
        quality: JPEG compression quality (default 90)
        scale: Amplification factor for differences (default 20)
        
    Returns:
        Tuple of (ELA image, anomaly score 0-100)
    """
    # Ensure image is in RGB mode
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Save to buffer with specified quality
    buffer = io.BytesIO()
    image.save(buffer, format='JPEG', quality=quality)
    buffer.seek(0)
    
    # Load the compressed version
    compressed = Image.open(buffer)
    
    # Calculate the difference
    diff = ImageChops.difference(image, compressed)
    
    # Convert to numpy for processing
    diff_array = np.array(diff, dtype=np.float32)
    
    # Amplify the differences
    diff_array = diff_array * scale
    diff_array = np.clip(diff_array, 0, 255).astype(np.uint8)
    
    # Calculate anomaly score based on variance in ELA
    ela_gray = cv2.cvtColor(diff_array, cv2.COLOR_RGB2GRAY)
    
    # Divide image into blocks and calculate variance
    h, w = ela_gray.shape
    block_size = 32
    variances = []
    
    for i in range(0, h - block_size, block_size):
        for j in range(0, w - block_size, block_size):
            block = ela_gray[i:i+block_size, j:j+block_size]
            variances.append(np.var(block))
    
    if variances:
        # High variance between blocks suggests tampering
        variance_of_variances = np.std(variances)
        max_expected_variance = 100  # Calibration value
        anomaly_score = min(100, (variance_of_variances / max_expected_variance) * 100)
    else:
        anomaly_score = 0
    
    ela_image = Image.fromarray(diff_array)
    
    return ela_image, anomaly_score


def detect_noise_variance(image: Image.Image) -> Dict[str, Any]:
    """
    Analyze noise patterns in the image to detect AI inpainting.
    
    AI-generated or inpainted regions often have unnaturally smooth textures
    compared to the natural grain of camera photos.
    
    Args:
        image: PIL Image object
        
    Returns:
        Dictionary containing:
        - overall_variance: Global noise variance
        - region_analysis: Analysis of different image regions
        - inconsistency_score: 0-100 score of noise inconsistency
        - flags: Warning messages
    """
    # Convert to numpy array
    img_array = np.array(image)
    
    # Convert to grayscale
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    else:
        gray = img_array
    
    # Apply Laplacian filter to detect edges/noise
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    
    # Calculate overall variance
    overall_variance = laplacian.var()
    
    # Divide image into regions and analyze each
    h, w = gray.shape
    grid_size = 4  # 4x4 grid
    block_h, block_w = h // grid_size, w // grid_size
    
    region_variances = []
    region_analysis = []
    
    for i in range(grid_size):
        for j in range(grid_size):
            y1, y2 = i * block_h, (i + 1) * block_h
            x1, x2 = j * block_w, (j + 1) * block_w
            
            region = laplacian[y1:y2, x1:x2]
            var = region.var()
            region_variances.append(var)
            
            region_analysis.append({
                "position": f"({i},{j})",
                "variance": var
            })
    
    # Calculate inconsistency score
    if region_variances:
        mean_var = np.mean(region_variances)
        std_var = np.std(region_variances)
        
        # Coefficient of variation
        if mean_var > 0:
            cv = (std_var / mean_var) * 100
        else:
            cv = 0
        
        # Normalize to 0-100 scale
        inconsistency_score = min(100, cv * 2)
    else:
        inconsistency_score = 0
    
    # Generate flags
    flags = []
    
    # Check for unnaturally smooth regions
    min_var = min(region_variances) if region_variances else 0
    max_var = max(region_variances) if region_variances else 0
    
    if max_var > 0 and min_var / max_var < 0.1:
        flags.append("⚠️ Detected regions with abnormally low noise - possible AI smoothing")
    
    if overall_variance < 50:
        flags.append("⚠️ Overall image has unusually low noise variance")
    elif overall_variance > 5000:
        flags.append("ℹ️ High noise levels detected - may be low-light photo or compressed")
    
    if inconsistency_score > 50:
        flags.append("⚠️ Significant noise inconsistency between regions")
    
    if not flags:
        flags.append("✅ Noise patterns appear consistent")
    
    return {
        "overall_variance": overall_variance,
        "region_analysis": region_analysis,
        "inconsistency_score": inconsistency_score,
        "flags": flags,
        "min_variance": min_var,
        "max_variance": max_var
    }


def calculate_suspicion_score(
    metadata_result: Dict[str, Any],
    ela_score: float,
    noise_result: Dict[str, Any]
) -> Tuple[int, str]:
    """
    Calculate overall suspicion score based on all analyses.
    
    Scoring breakdown:
    - Metadata issues: up to 40%
    - ELA anomalies: up to 40%
    - Noise variance inconsistency: up to 20%
    
    Args:
        metadata_result: Result from analyze_metadata()
        ela_score: Anomaly score from perform_ela()
        noise_result: Result from detect_noise_variance()
        
    Returns:
        Tuple of (score 0-100, risk level string)
    """
    score = 0
    
    # Metadata contribution (40%)
    if metadata_result["risk_level"] == "High":
        score += 40
    elif metadata_result["risk_level"] == "Medium":
        score += 20
    
    # ELA contribution (40%)
    ela_contribution = (ela_score / 100) * 40
    score += ela_contribution
    
    # Noise variance contribution (20%)
    noise_contribution = (noise_result["inconsistency_score"] / 100) * 20
    score += noise_contribution
    
    # Determine risk level
    if score >= 70:
        risk_level = "🔴 High Risk"
    elif score >= 40:
        risk_level = "🟡 Medium Risk"
    else:
        risk_level = "🟢 Low Risk"
    
    return int(score), risk_level
