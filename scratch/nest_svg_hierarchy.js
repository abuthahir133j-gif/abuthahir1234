const fs = require('fs');

function nestSvgHierarchy(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract base64 image tag from defs
    const imgMatch = content.match(/<image id="buddy-char-asset"[^>]+>/);
    if (!imgMatch) {
        console.error('Could not find buddy-char-asset in', filePath);
        return;
    }
    const imgTag = imgMatch[0];

    const nestedSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 672 1024" width="100%" height="100%" id="buddy-root">
  <defs>
    <!-- Master High-Resolution Character Asset Source -->
    ${imgTag}

    <!-- Accurate Anatomical Clip Paths for Body Parts -->
    <!-- Head & Visor Clip -->
    <clipPath id="clip-buddy-head">
      <path d="M 336 130 C 210 130 115 210 115 320 C 115 420 200 472 336 472 C 472 472 557 420 557 320 C 557 210 462 130 336 130 Z"/>
    </clipPath>

    <!-- Eyes & Face Glow Features Clip -->
    <clipPath id="clip-buddy-left-eye">
      <ellipse cx="270" cy="325" rx="34" ry="46"/>
    </clipPath>
    <clipPath id="clip-buddy-right-eye">
      <ellipse cx="405" cy="325" rx="34" ry="46"/>
    </clipPath>
    <clipPath id="clip-buddy-mouth">
      <path d="M 305 365 C 305 395 367 395 367 365 Z"/>
    </clipPath>

    <!-- Torso & Pelvis Clip -->
    <clipPath id="clip-buddy-body">
      <path d="M 230 470 L 442 470 C 470 510 470 630 435 675 L 237 675 C 202 630 202 510 230 470 Z"/>
    </clipPath>

    <!-- Left Arm Assembly Clips (Screen Left) -->
    <clipPath id="clip-buddy-left-upper-arm">
      <path d="M 170 485 C 230 485 240 550 205 605 C 175 625 145 595 150 545 C 150 515 158 485 170 485 Z"/>
    </clipPath>
    <clipPath id="clip-buddy-left-forearm">
      <path d="M 140 595 C 190 600 190 675 160 720 C 130 720 115 675 125 625 C 130 605 135 595 140 595 Z"/>
    </clipPath>
    <clipPath id="clip-buddy-left-hand">
      <path d="M 110 705 C 175 705 185 780 155 830 C 120 830 95 780 100 735 Z"/>
    </clipPath>

    <!-- Right Arm Assembly Clips (Screen Right) -->
    <clipPath id="clip-buddy-right-upper-arm">
      <path d="M 502 485 C 442 485 432 550 467 605 C 497 625 527 595 522 545 C 522 515 514 485 502 485 Z"/>
    </clipPath>
    <clipPath id="clip-buddy-right-forearm">
      <path d="M 532 595 C 482 600 482 675 512 720 C 542 720 557 675 547 625 C 542 605 537 595 532 595 Z"/>
    </clipPath>
    <clipPath id="clip-buddy-right-hand">
      <path d="M 562 705 C 497 705 487 780 517 830 C 552 830 577 780 572 735 Z"/>
    </clipPath>

    <!-- Left Leg Assembly Clips (Screen Left) -->
    <clipPath id="clip-buddy-left-thigh">
      <path d="M 220 665 L 305 665 L 305 775 L 220 775 Z"/>
    </clipPath>
    <clipPath id="clip-buddy-left-foot">
      <path d="M 185 765 L 315 765 L 315 930 L 185 930 Z"/>
    </clipPath>

    <!-- Right Leg Assembly Clips (Screen Right) -->
    <clipPath id="clip-buddy-right-thigh">
      <path d="M 367 665 L 452 665 L 452 775 L 367 775 Z"/>
    </clipPath>
    <clipPath id="clip-buddy-right-foot">
      <path d="M 357 765 L 487 765 L 487 930 L 357 930 Z"/>
    </clipPath>
  </defs>

  <!-- Complete Connected Hierarchical Character Rig -->
  <g id="buddy-robot">

    <!-- Torso & Body Base (Pivot: 336, 570) -->
    <g id="buddy-body">
      <use xlink:href="#buddy-char-asset" clip-path="url(#clip-buddy-body)"/>

      <!-- Left Leg Hierarchical Kinematic Chain (Hip -> Knee/Foot) -->
      <g id="buddy-left-leg">
        <g id="buddy-left-thigh">
          <use xlink:href="#buddy-char-asset" clip-path="url(#clip-buddy-left-thigh)"/>
          <g id="buddy-left-foot">
            <use xlink:href="#buddy-char-asset" clip-path="url(#clip-buddy-left-foot)"/>
          </g>
        </g>
      </g>

      <!-- Right Leg Hierarchical Kinematic Chain (Hip -> Knee/Foot) -->
      <g id="buddy-right-leg">
        <g id="buddy-right-thigh">
          <use xlink:href="#buddy-char-asset" clip-path="url(#clip-buddy-right-thigh)"/>
          <g id="buddy-right-foot">
            <use xlink:href="#buddy-char-asset" clip-path="url(#clip-buddy-right-foot)"/>
          </g>
        </g>
      </g>

      <!-- Left Arm Hierarchical Kinematic Chain (Shoulder -> Elbow -> Wrist) -->
      <g id="buddy-left-arm">
        <g id="buddy-left-upper-arm">
          <use xlink:href="#buddy-char-asset" clip-path="url(#clip-buddy-left-upper-arm)"/>
          <g id="buddy-left-forearm">
            <use xlink:href="#buddy-char-asset" clip-path="url(#clip-buddy-left-forearm)"/>
            <g id="buddy-left-hand">
              <use xlink:href="#buddy-char-asset" clip-path="url(#clip-buddy-left-hand)"/>
            </g>
          </g>
        </g>
      </g>

      <!-- Right Arm Hierarchical Kinematic Chain (Shoulder -> Elbow -> Wrist) -->
      <g id="buddy-right-arm">
        <g id="buddy-right-upper-arm">
          <use xlink:href="#buddy-char-asset" clip-path="url(#clip-buddy-right-upper-arm)"/>
          <g id="buddy-right-forearm">
            <use xlink:href="#buddy-char-asset" clip-path="url(#clip-buddy-right-forearm)"/>
            <g id="buddy-right-hand">
              <use xlink:href="#buddy-char-asset" clip-path="url(#clip-buddy-right-hand)"/>
            </g>
          </g>
        </g>
      </g>

    </g>

    <!-- Head Assembly (Pivot: Neck 336, 465) -->
    <g id="buddy-head">
      <g id="buddy-head-base">
        <use xlink:href="#buddy-char-asset" clip-path="url(#clip-buddy-head)"/>
      </g>
      <!-- Facial Features -->
      <g id="buddy-face-features">
        <g id="buddy-left-eye">
          <use xlink:href="#buddy-char-asset" clip-path="url(#clip-buddy-left-eye)"/>
        </g>
        <g id="buddy-right-eye">
          <use xlink:href="#buddy-char-asset" clip-path="url(#clip-buddy-right-eye)"/>
        </g>
        <g id="buddy-mouth">
          <use xlink:href="#buddy-char-asset" clip-path="url(#clip-buddy-mouth)"/>
        </g>
      </g>
    </g>

  </g>
</svg>
`;

    fs.writeFileSync(filePath, nestedSvg, 'utf8');
    console.log('Successfully updated', filePath, 'with hierarchical rig structure!');
}

nestSvgHierarchy('AI/png.svg');
nestSvgHierarchy('AI/PNg.svg');
nestSvgHierarchy('AI/idle.svg');
