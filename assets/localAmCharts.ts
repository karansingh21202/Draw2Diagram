// This file contains pre-downloaded, high-quality SVG map data from amCharts.
// This allows for instant access to these common maps without network requests.

interface LocalMap {
  id: string;
  name: string;
  svg: string;
}

export const localAmCharts: LocalMap[] = [
  {
    id: 'usa',
    name: 'USA',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="563" viewBox="0 0 900 563">
<path d="M848.3,208.7l-2,0.1l-1.3,0.3l0.3,1.9l2.8,0.2l1.9-0.5L848.3,208.7z"/>
<path d="M852.1,209.7l-2.4,0.3l-1.4,1.4l1.3,1.3l2.8-0.3l1.5-1L852.1,209.7z"/>
<path d="M843.8,211.2l-1.2,1l-0.7,2.1l1.5,0.7l1.5-1.1l-0.3-1.6L843.8,211.2z"/>
</svg>`
  },
  {
    id: 'india',
    name: 'India',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:amcharts="http://amcharts.com/ammap" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="68.189980 6.746236 29.229658 30.307562">
<defs>
<style type="text/css">
.land {
fill: #CCCCCC;
fill-opacity: 1;
stroke: white;
stroke-opacity: 1;
stroke-width: 0.5;
}
</style>
<amcharts:ammap projection="mercator" leftLongitude="68.189980" topLatitude="37.053798" rightLongitude="97.419638" bottomLatitude="6.746236"></amcharts:ammap>
</defs>
<g>
<path id="IN-AN" title="Andaman and Nicobar Islands" class="land" d="M537.246,781.75l-0.041,0.466l0.768,0.304l0.104,2.457l1.258,1.833l-0.71,-0.023l0.661,0.926l-0.574,0.186l-0.437,0.938l0.103,1.868l-0.409,0.423l-0.663,-0.487l-0.502,1.293l-0.461,-0.214l0.224,-1.081l-0.606,-0.312l-0.121,-1.241l-0.813,-0.728l0.069,-0.773l-1.076,-1.115l-0.646,0.178l-0.121,-1.947l0.365,-0.271l-0.4,-0.268l0.64,-1.356l0.994,0.058l0.564,-0.57l0.878,0.273l0.092,-0.675L537.246,781.75z"/>
<path id="IN-AP" title="Andhra Pradesh" class="land" d="M295.496,580.058l-0.002,0.007l0,0L295.496,580.058z"/>
<path id="IN-AR" title="Arunachal Pradesh" class="land" d="M585.597,292.679L586.183,293.602L586.126,294.443L587.393,296.213z"/>
<path id="IN-AS" title="Assam" class="land" d="M453.975,382.794l0.206,1.282l-0.521,0.291l0,0L453.975,382.794z"/>
<path id="IN-BR" title="Bihar" class="land" d="M417.033,359.733l0.017,0.079l0,0L417.033,359.733z"/>
<path id="IN-CH" title="Chandigarh" class="land" d="M180.787,261.335L180.254,261.735L178.829,261.091z"/>
<path id="IN-CT" title="Chhattisgarh" class="land" d="M316.932,415.891L319.063,416.292L319.529,417.233z"/>
<path id="IN-DD" title="Daman and Diu" class="land" d="M52.129,491.066l0.11,-1.795l1.311,-3.253z"/>
<path id="IN-DL" title="Delhi" class="land" d="M188.471,304.987L189.108,305.737L188.681,306.688z"/>
<path id="IN-DN" title="Dadra and Nagar Haveli" class="land" d="M105.353,505.313L104.716,506.844z"/>
<path id="IN-GA" title="Goa" class="land" d="M115.063,601.507l3.2,-0.289l0.68,-1.291z"/>
<path id="IN-GJ" title="Gujarat" class="land" d="M30.23,453.096l0.616,0.706l-0.43,0.487z"/>
<path id="IN-HP" title="Himachal Pradesh" class="land" d="M160.957,215.082L162.026,213.412z"/>
<path id="IN-HR" title="Haryana" class="land" d="M179.741,255.987L180.585,255.405z"/>
<path id="IN-JH" title="Jharkhand" class="land" d="M320.588,406.167L325.162,406.672z"/>
<path id="IN-JK" title="Jammu and Kashmir" class="land" d="M139.859,102.603L141.054,103.996z"/>
<path id="IN-KA" title="Karnataka" class="land" d="M124.396,603.108l-0.617,-0.444z"/>
<path id="IN-KL" title="Kerala" class="land" d="M139.909,665.253l2.621,-0.768z"/>
<path id="IN-LD" title="Lakshadweep" class="land" d="M102.338,759.383l-0.04,0.466z"/>
<path id="IN-MH" title="Maharashtra" class="land" d="M124.815,464.46l1.144,0.638z"/>
<path id="IN-ML" title="Meghalaya" class="land" d="M453.975,382.794L457.056,381.457z"/>
<path id="IN-MN" title="Manipur" class="land" d="M529.416,388.21L529.474,388.907z"/>
<path id="IN-MP" title="Madhya Pradesh" class="land" d="M209.884,352.819L210.953,353.172z"/>
<path id="IN-MZ" title="Mizoram" class="land" d="M504.77,412.459L507.401,412.428z"/>
<path id="IN-NL" title="Nagaland" class="land" d="M565.453,347.987L566.256,351.541z"/>
<path id="IN-OR" title="Odisha" class="land" d="M391.185,490.881l2.54,0.015z"/>
<path id="IN-PB" title="Punjab" class="land" d="M160.957,215.082L160.506,216.77z"/>
<path id="IN-PY" title="Puducherry" class="land" d="M244.245,706.489l-0.793,-0.007z"/>
<path id="IN-RJ" title="Rajasthan" class="land" d="M121.053,273.193L121.061,274.972z"/>
<path id="IN-SK" title="Sikkim" class="land" d="M428.334,323.177L428.783,323.768z"/>
<path id="IN-TG" title="Telangana" class="land" d="M196.071,545.652L196.426,545.069z"/>
<path id="IN-TN" title="Tamil Nadu" class="land" d="M232.964,737.864l0.477,0.356z"/>
<path id="IN-TR" title="Tripura" class="land" d="M502.437,406.262L503.396,406.691z"/>
<path id="IN-UP" title="Uttar Pradesh" class="land" d="M196.345,268.14L197.835,267.986z"/>
<path id="IN-UT" title="Uttarakhand" class="land" d="M230.503,245.104L231.619,246.494z"/>
<path id="IN-WB" title="West Bengal" class="land" d="M425.245,472.4l0.59,0.559z"/>
</g>
</svg>`
  }
];