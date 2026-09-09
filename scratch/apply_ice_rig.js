const fs = require('fs');

const iceContent = fs.readFileSync('AI/ICE BLUE ROBOT.svg', 'utf8');
const match = iceContent.match(/<image[^>]+xlink:href="([^"]+)"/);
if (!match) {
    console.error('No base64 image found in AI/ICE BLUE ROBOT.svg');
    process.exit(1);
}
const iceBase64 = match[1];

// Rigged Ice Blue Robot SVG matching PNg.svg structure
const riggedIceSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 672 1024" width="100%" height="100%" id="buddy-root">
  <defs>
    <!-- Master High-Resolution Ice Blue Robot Character Asset Source -->
    <image id="buddy-char-asset" width="672" height="1024" preserveAspectRatio="none" xlink:href="${iceBase64}"/>

    <!-- Accurate Anatomical Clip Paths for Ice Blue Robot (encompassing ice crystals & spikes) -->
    <!-- Head & Visor & Crystal Crown Clip -->
    <clipPath id="clip-buddy-head">
      <path d="M 336 5 C 190 5 95 160 95 320 C 95 435 190 472 336 472 C 482 472 577 435 577 320 C 577 160 482 5 336 5 Z"/>
    </clipPath>

    <!-- Eyes & Face Glow Features Clip -->
    <clipPath id="clip-buddy-left-eye">
      <ellipse cx="270" cy="325" rx="38" ry="50"/>
    </clipPath>
    <clipPath id="clip-buddy-right-eye">
      <ellipse cx="405" cy="325" rx="38" ry="50"/>
    </clipPath>
    <clipPath id="clip-buddy-mouth">
      <path d="M 300 360 C 300 398 372 398 372 360 Z"/>
    </clipPath>

    <!-- Torso & Pelvis Clip (including chest crystal core) -->
    <clipPath id="clip-buddy-body">
      <path d="M 215 465 L 457 465 C 490 510 490 630 455 678 L 217 678 C 182 630 182 510 215 465 Z"/>
    </clipPath>

    <!-- Left Arm Assembly Clips (with ice shoulder crystal & wrist spikes) -->
    <clipPath id="clip-buddy-left-upper-arm">
      <path d="M 170 450 C 235 450 250 550 205 605 C 160 635 125 595 130 540 C 130 500 145 450 170 450 Z"/>
    </clipPath>
    <clipPath id="clip-buddy-left-forearm">
      <path d="M 125 585 C 195 590 195 680 165 725 C 120 725 90 680 105 620 C 110 595 118 585 125 585 Z"/>
    </clipPath>
    <clipPath id="clip-buddy-left-hand">
      <path d="M 95 700 C 175 700 185 785 155 845 C 110 845 80 785 85 735 Z"/>
    </clipPath>

    <!-- Right Arm Assembly Clips (with ice shoulder crystal & wrist spikes) -->
    <clipPath id="clip-buddy-right-upper-arm">
      <path d="M 502 450 C 437 450 422 550 467 605 C 512 635 547 595 542 540 C 542 500 527 450 502 450 Z"/>
    </clipPath>
    <clipPath id="clip-buddy-right-forearm">
      <path d="M 547 585 C 477 590 477 680 507 725 C 552 725 582 680 567 620 C 562 595 554 585 547 585 Z"/>
    </clipPath>
    <clipPath id="clip-buddy-right-hand">
      <path d="M 577 700 C 497 700 487 785 517 845 C 562 845 592 785 587 735 Z"/>
    </clipPath>

    <!-- Left Leg Assembly Clips (with ice knee crystal & boot spikes) -->
    <clipPath id="clip-buddy-left-thigh">
      <path d="M 210 660 L 315 660 L 315 780 L 210 780 Z"/>
    </clipPath>
    <clipPath id="clip-buddy-left-foot">
      <path d="M 160 765 L 325 765 L 325 950 L 160 950 Z"/>
    </clipPath>

    <!-- Right Leg Assembly Clips (with ice knee crystal & boot spikes) -->
    <clipPath id="clip-buddy-right-thigh">
      <path d="M 357 660 L 462 660 L 462 780 L 357 780 Z"/>
    </clipPath>
    <clipPath id="clip-buddy-right-foot">
      <path d="M 347 765 L 512 765 L 512 950 L 347 950 Z"/>
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

fs.writeFileSync('AI/ICE BLUE ROBOT.svg', riggedIceSvg, 'utf8');
console.log('Successfully updated AI/ICE BLUE ROBOT.svg with complete hierarchical rig structure!');
