// Profile stations are measured on each approved side elevation. Dimensions are metres.
// Each row is [longitudinal pixel, shoulder y, roof/hood y, body width, top width].
// The last two numbers are fractions of the body's half-width at that station.
export const LINEUP = {
  'rally-hatch': {
    length:3.95, width:1.78, height:1.50, wheelbase:2.52, radius:.348, tire:.215,
    color:'#153d99', rim:'#e4dcbd', spokes:8, wheelPixels:[260,596],
    bounds:[175,706], ground:434, roofPixel:232, sideRect:[173,229,708,436],
    frontRect:[31,82,601,562], rearRect:[647,81,1229,562],
    sill:403, beltInset:.028, endRound:.16, crown:.028,
    sections:[
      [175,317,301,.88,.81],[183,307,298,.96,.88],[191,302,295,.98,.87],
      [204,300,284,.98,.84],[227,297,255,.99,.78],[248,296,240,1,.73],
      [270,296,235,1,.73],[311,297,232,.99,.74],[365,298,232,.985,.74],
      [419,299,233,.985,.74],[444,299,237,.99,.75],[459,300,244,.99,.77],
      [482,301,260,.99,.79],[513,302,282,.99,.83],[538,303,295,1,.87],
      [565,306,298,1,.86],[608,311,302,1,.86],[647,317,308,.995,.85],
      [673,325,316,.98,.85],[688,335,325,.96,.84],[706,345,329,.86,.78]
    ],
    // Side-image coordinates for longitudinal glass boundaries; head-on image trapezoids.
    windscreens:[
      {end:'rear',start:192,stop:252,lower:[741,1148,241],upper:[792,1099,137]},
      {end:'front',start:449,stop:537,upper:[167,467,127],lower:[104,526,248]}
    ],
    fascia:{front:[88,545,315,518],rear:[658,1220,257,489]},
    tailLights:[[-.85,-.66,.80],[-.85,-.66,.72],[.66,.85,.80],[.66,.85,.72]],
    hood:[539,686], mirrors:[494,299], spoiler:[186,241], rearDeck:[181,193]
  },
  'muscle-coupe': {
    length:4.80, width:1.90, height:1.32, wheelbase:2.78, radius:.345, tire:.235,
    color:'#273d24', rim:'#acaaa3', spokes:5, wheelPixels:[231,680],
    bounds:[58,821],ground:220,roofPixel:10,sideRect:[57,8,824,222],
    frontRect:[15,725,615,1183],rearRect:[637,725,1244,1183],
    sill:177,beltInset:.035,endRound:.15,crown:.025,
    sections:[
      [58,119,107,.90,.84],[67,101,86,.96,.89],[83,90,77,.985,.88],
      [107,85,75,.99,.87],[134,82,69,.99,.86],[171,78,58,1,.82],
      [214,76,45,1,.79],[256,76,33,.995,.75],[305,78,22,.99,.73],
      [345,79,15,.985,.73],[392,79,11,.985,.73],[436,79,10,.99,.74],
      [463,79,12,.99,.76],[481,80,19,.99,.77],[503,80,36,.99,.80],
      [528,81,54,.99,.82],[551,82,71,.995,.86],[577,84,74,1,.87],
      [619,85,71,1,.87],[670,85,71,1,.87],[711,88,76,.995,.86],
      [751,91,82,.985,.85],[790,98,90,.97,.84],[811,105,97,.94,.83],
      [821,115,104,.89,.82]
    ],
    windscreens:[
      {end:'rear',start:133,stop:349,lower:[764,1126,854],upper:[791,1090,769]},
      {end:'front',start:472,stop:552,upper:[168,464,760],lower:[108,522,858]}
    ],
    fascia:{front:[33,596,939,1113],rear:[650,1230,919,1102]},
    tailLights:[[-.84,-.28,.64],[.28,.84,.64]],
    hood:[551,811],mirrors:[502,78],rearDeck:[74,131]
  }
};
export const lineupIds=Object.keys(LINEUP);
