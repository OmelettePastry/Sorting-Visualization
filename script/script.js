const canvas = document.querySelector('.myCanvas');
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
const context = canvas.getContext('2d');

const offscreenCanvas = document.createElement('canvas');
const offCanvasWidth = offscreenCanvas.width = canvasWidth;
const offCanvasHeight = offscreenCanvas.height = canvasHeight;
const offCanvasContext = offscreenCanvas.getContext('2d');

const SORT_SWAP = "sort-swap";
const PIVOT_SWAP = "pivot-swap";
const HIGHLIGHT = "highlight";

const FIXED = "fixed-speed";
const VARIABLE = "variable-speed";

const HIGHLIGHT_LIMIT = 5;

const BAR_WIDTH = 5;
const NUM_ITEMS = 75;
const HEIGHT_MULT = 4;
const SWAP_VAL = 15;    // Swap speed (distance divided by this number)
const FIXED_SPEED = 20;  // Fied speed

// Note reset of values
let initializedOff = false;
let initEndValues = false;
let barSpeed;
let animateFinished = false;
let playing = false;
let highlightStart = false;
let endItem;    // debug
let speedType = VARIABLE;

// Fix colors

let listArray = [];
let backupListArray = []; // Remove later
let barObjects = {};    // Remove
let barArray = [];      // Remove
let barList;            // Modify - use of array outside object ? ?
                        //   Leave as array, not object which contains an array ?
let item;
let originalBarPos1, originalBarPos2;
let highlightTimer;

class AnimatePivot
{
  constructor (animateType, value1, pivot, startIndex, endIndex)
  {
    this.animateType = animateType;
    this.value1 = value1;
    this.pivot = pivot;
    this.startIndex = startIndex;
    this.endIndex = endIndex;
  }

  getAnimateType ()
  { return this.animateType; }

  getStartIndex ()
  { return this.startIndex; }

  getEndIndex ()
  { return this.endIndex; }

  getPivot ()
  { return this.pivot; }

  getValue1 ()
  { return this.value1; }

}

class AnimateCompare extends AnimatePivot
{
  constructor (animateType, value1, value2, pivot, startIndex, endIndex)
  {
    super(animateType, value1, pivot, startIndex, endIndex);
    
    this.value2 = value2;
  }

  getValue2 ()
  { return this.value2; }

}

class BarItem
{
  constructor (value, originX, height, color)
  {
    this.value = value
    this.originX = originX;
    this.height = height;
    this.color = color;
  }

  getOriginX ()
  { return this.originX; }

  getHeight ()
  { return this.height; }

  getColor ()
  { return this.color; }

  getValue ()
  { return this.value; }

  setOriginX (originX)
  { this.originX = originX; }

  setColor (color)
  { this.color = color; }

}

class BarList
{
  constructor ()
  {
    this.barList = [];
  }

  getArray ()
  { return this.barList; }

  getItemByValue (value)
  {
    let found = false;
    let counter = -1;

    while (!found)
    {
      counter++;

      if (value == this.barList[counter].getValue())
      { found = true; }
    }

    return this.barList[counter];
  }

  addItem (item)
  {
    this.barList.push(item);
  }

  getIndex (value)
  {
    let counter = -1;
    let found = false;

    while (!found || (counter > this.barList.length - 1))
    {
      counter++;

      if (this.barList[counter].getValue() == value)
      { found = true; }
    }

    return counter;
    
  }

  swap (index1, index2)
  {
    let temp = this.barList[index1];
    this.barList[index1] = this.barList[index2];
    this.barList[index2] = temp;
  }  
  
}

// Return a number bewteen min and max (exclusive)
function randInt (min, max)
{
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

function quickSort (array)
{
  quickSortHelper (array, 0, array.length - 1);
}

function quickSortHelper (array, lo, hi)
{
  let p = lo + randInt(0, hi - lo);

  // console.log(p)
  if (hi > lo)
  {
    p = partition(array, lo, hi, p);
    quickSortHelper(array, lo, p - 1);
    quickSortHelper(array, p + 1, hi);
  }
}

function partition (array, lo, hi, r)
{
  /**
   * leftIndex:  index starting from the left
   * rightIndex: index starting from the right
   * pivotValue: value of pivot index
   */
  let leftIndex, rightIndex, pivotValue;

  // Push animation object into the array first to get the original indexed values
  listArray.push(new AnimatePivot(PIVOT_SWAP, array[hi], array[r], lo, hi))

  swap(array, r, hi);

  rightIndex = hi - 1;
  leftIndex = lo;
  pivotValue = array[hi];

  listArray.push(new AnimateCompare(HIGHLIGHT, array[leftIndex], array[rightIndex], pivotValue, lo, hi));

  while (leftIndex <= rightIndex)
  {
    if (array[leftIndex] <= pivotValue)
    {
      leftIndex++;
      listArray.push(new AnimateCompare(HIGHLIGHT, array[leftIndex], array[rightIndex], pivotValue, lo, hi));
    
    } else
    {
      listArray.push(new AnimateCompare(SORT_SWAP, array[leftIndex], array[rightIndex], pivotValue, lo, hi));      
      swap(array, leftIndex, rightIndex);
      rightIndex--;

      if (rightIndex > 0)
      {
        listArray.push(new AnimateCompare(HIGHLIGHT, array[leftIndex], array[rightIndex], pivotValue, lo, hi));

      }
    }
  }

  listArray.push(new AnimatePivot(PIVOT_SWAP, array[rightIndex + 1], array[hi], lo, hi));

  swap(array, hi, rightIndex + 1);

  // listArray.push(new AnimateCompare(HIGHLIGHT, array[leftIndex], array[rightIndex + 1], pivotValue, lo, hi));
  // backupListArray.push(new AnimateCompare(HIGHLIGHT, array[leftIndex], array[rightIndex + 1], pivotValue, lo, hi));  

  return (rightIndex + 1);
}

function swap (array, a, b)
{
  let temp = array[a];

  array[a] = array[b];
  array[b] = temp;
}

function createBarList (array, width)
{
  // TTT
  // console.log("CreateBatList");
  let startX = Math.floor((canvasWidth - (array.length * (width + 5))) / 2);
  let ourBarList = new BarList();

  for (let i = 0; i < array.length; i++)
  {
    // Remove ?
    /*
    ourBars[array[i]] = { "originX" : (startX + (i * (width + 5))),
                          "height" : array[i] * 10, "color" : 'rgb(255, 0, 255)' };
    */
    ourBarList.addItem(new BarItem(array[i], startX + (i * (width + 5)), array[i] * HEIGHT_MULT, "rgb(255, 0, 255)"));
  }

  return ourBarList;
}

function animateItem ()
{
  // TTT
  // console.log("animateItem()");

  let elementValue1, elementValue2, pivotValue, barObject1, barObject2;
  let barArray = barList.getArray();

  // console.log(listArray.length);
  // console.log("Aftermath");

  // let animateFinished = false;

  // TTT
  // console.log(item.getAnimateType());

  /** Animation setup for a Pivot Swap */  
  if (item.getAnimateType() === PIVOT_SWAP)
  {
    // TTT
    // console.log("PIVOT SWAP");
    // console.log(item);

    // 'elementValue1' represent the pivot
    elementValue1 = item.getPivot();
    elementValue2 = item.getValue1();
    pivotValue = elementValue1;

    // Get the appropriate bar objects from the list
    barObject1 = barList.getItemByValue(elementValue1);
    barObject2 = barList.getItemByValue(elementValue2);
    pivotObject = barObject1;

    // Set colors for the bars
    barObject1.setColor("rgb(255, 0, 0)");
    barObject2.setColor("rgb(0, 0, 255)");

    // console.log("swapping", elementValue1, "with", elementValue2);
    if ((elementValue1 == elementValue2))
    {
      console.log("Pivot and Value 1 are the same");
      return true;
    }

    /*
    barObjects[bar1]["color"] = 'rgb(255, 0, 0)';
    barObjects[bar2]["color"] = 'rgb(0, 0, 255)';
    */

  /** Animation setup for SORT-SWAP */ 
  } else if ((item.getAnimateType() === SORT_SWAP) || (item.getAnimateType() === HIGHLIGHT))
  {
    // TTT
    // console.log("SORT SWAP");
    // console.log(item);
    elementValue1 = item.getValue1();
    elementValue2 = item.getValue2();
    pivotValue = item.getPivot();

    barObject1 = barList.getItemByValue(elementValue1);
    barObject2 = barList.getItemByValue(elementValue2);
    pivotObject = barList.getItemByValue(pivotValue);    

    barObject1.setColor("rgb(0, 0, 255)");
    barObject2.setColor("rgb(0, 0, 255)");
    pivotObject.setColor("rgb(255, 0, 0)");

    if (item.getAnimateType() == SORT_SWAP)
    {
      console.log("swapping", elementValue1, "with", elementValue2);
    }
    /*
    barObjects[pivot]["color"] = 'rgb(255, 0, 0)';
    barObjects[bar1]["color"] = 'rgb(0, 0, 255)';    
    barObjects[bar2]["color"] = 'rgb(0, 0, 255)';
    */
  }

  // Draw static background to offscreen canvas if not already initialized
  if (initializedOff === false)
  {

    offCanvasContext.clearRect(0, 0, offCanvasWidth, offCanvasHeight);

    for (const barItem of barArray)
    {
      if (!((elementValue1 == barItem.getValue()) || (elementValue2 == barItem.getValue()) ||
            (pivotValue == barItem.getValue())))
      {

        barItem.setColor('rgb(255, 128, 255)');
        offCanvasContext.fillStyle = barItem.getColor();
        offCanvasContext.fillRect(barItem.getOriginX(), 450 - barItem.getHeight(),
                                  BAR_WIDTH, barItem.getHeight());
        
      }
    }

    for (let i = item.getStartIndex(); i <= item.getEndIndex(); i++)
    {
      let barItem = barArray[i];

      if (!((elementValue1 == barItem.getValue()) || (elementValue2 == barItem.getValue()) ||
            (pivotValue == barItem.getValue())))
      {
        barItem.setColor('rgb(255, 0, 255)');
        offCanvasContext.fillStyle = barItem.getColor();
        offCanvasContext.fillRect(barItem.getOriginX(), 450 - barItem.getHeight(),
                                  BAR_WIDTH, barItem.getHeight());
        
      }  

    }

    if ((item.getAnimateType() === SORT_SWAP) || (item.getAnimateType() === HIGHLIGHT))
    {
      offCanvasContext.fillStyle = pivotObject.getColor();
      offCanvasContext.fillRect(pivotObject.getOriginX(), 450 - pivotObject.getHeight(),
                                BAR_WIDTH, pivotObject.getHeight());
    }

    // Swap values in the array
    if (item.getAnimateType() == PIVOT_SWAP)
    {
      let index1 = barList.getIndex(pivotValue);
      let index2 = barList.getIndex(elementValue2);
      barList.swap(index1, index2);
    } else if (item.getAnimateType() == SORT_SWAP)
    {
      let index1 = barList.getIndex(elementValue1);
      let index2 = barList.getIndex(elementValue2);
      barList.swap(index1, index2);    
    }

    initializedOff = true;
  }

  if (highlightStart === false)
  {
    highlightTimer = 0;
    highlightStart = true;
  }

  if (initEndValues === false)
  {
    // Get original x position of our pbjects
    
    // TTT
    //console.log(barObject1);
    originalBarPos1 = barObject1.getOriginX();
    originalBarPos2 = barObject2.getOriginX();

    if (speedType == FIXED)
    {
      barSpeed = FIXED_SPEED;
    } else
    {
      barSpeed = Math.abs(originalBarPos1 - originalBarPos2) / SWAP_VAL;
    }

    initEndValues = true;
  }

  if (item.getAnimateType() != HIGHLIGHT)
  {

    // Draw pivot and value1 bars here
    if (originalBarPos1 > originalBarPos2)
    {

      if (barObject1.getOriginX() > originalBarPos2)
      { barObject1.setOriginX(barObject1.getOriginX() - barSpeed); }

      if (barObject2.getOriginX() <  originalBarPos1)
      { barObject2.setOriginX(barObject2.getOriginX() + barSpeed); }

      if ((barObject1.getOriginX() <= originalBarPos2) &&
          (barObject2.getOriginX() >= originalBarPos1))
      {
        // Assure the bars have the precise coordinates after animation is finished
        barObject1.setOriginX(originalBarPos2);
        barObject2.setOriginX(originalBarPos1);

        /*
        console.log(barObject1.getValue(), barObject1.getOriginX(), barObject1.getHeight());
        console.log(barObject2.getValue(), barObject2.getOriginX(), barObject2.getHeight());

        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.drawImage(offscreenCanvas, 0, 0);
  
        context.fillStyle = barObject1.getColor();
        context.fillRect(barObject1.getOriginX(), 450 - barObject1.getHeight(),
                                  BAR_WIDTH, barObject1.getHeight());
        context.fillStyle = barObject2.getColor();
        context.fillRect(barObject2.getOriginX(), 450 - barObject2.getHeight(),
                                  BAR_WIDTH, barObject2.getHeight());
        */
        animateFinished = true;

        // barObject1.setColor('rgb(255, 0, 255)');    
        // barObject2.setColor('rgb(255, 0, 255)');
        // pivotObject.setColor('rgb(255, 0, 255)');         
      }

    } else
    {
      if (barObject1.getOriginX() < originalBarPos2)
      { barObject1.setOriginX(barObject1.getOriginX() + barSpeed); }

      if (barObject2.getOriginX() > originalBarPos1)
      { barObject2.setOriginX(barObject2.getOriginX() - barSpeed); }

      if ((barObject1.getOriginX() >= originalBarPos2) &&
          (barObject2.getOriginX() <= originalBarPos1))
      {
        barObject1.setOriginX(originalBarPos2);
        barObject2.setOriginX(originalBarPos1);

        /*
        console.log(barObject1.getValue(), barObject1.getOriginX(), barObject1.getHeight());
        console.log(barObject2.getValue(), barObject2.getOriginX(), barObject2.getHeight());

        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.drawImage(offscreenCanvas, 0, 0);
  
        context.fillStyle = barObject1.getColor();
        context.fillRect(barObject1.getOriginX(), 450 - barObject1.getHeight(),
                                  BAR_WIDTH, barObject1.getHeight());
        context.fillStyle = barObject2.getColor();
        context.fillRect(barObject2.getOriginX(), 450 - barObject2.getHeight(),
                                  BAR_WIDTH, barObject2.getHeight());
        */
        animateFinished = true;

        // barObject1.setColor('rgb(255, 0, 255)');    
        // barObject2.setColor('rgb(255, 0, 255)');
        // pivotObject.setColor('rgb(255, 0, 255)');          
      }
      /*
      // Copy contents of offscreen canvas to canvas
      context.clearRect(0, 0, canvasWidth, canvasHeight);
      context.drawImage(offscreenCanvas, 0, 0);

      context.fillStyle = barObject1.getColor();
      context.fillRect(barObject1.getOriginX(), 450 - barObject1.getHeight(),
                                BAR_WIDTH, barObject1.getHeight());
      context.fillStyle = barObject2.getColor();
      context.fillRect(barObject2.getOriginX(), 450 - barObject2.getHeight(),
                                BAR_WIDTH, barObject2.getHeight());
      */
    }

  // Copy contents of offscreen canvas to canvas
  context.clearRect(0, 0, canvasWidth, canvasHeight);
  context.drawImage(offscreenCanvas, 0, 0);

  context.fillStyle = barObject1.getColor();
  context.fillRect(barObject1.getOriginX(), 450 - barObject1.getHeight(),
                            BAR_WIDTH, barObject1.getHeight());
  context.fillStyle = barObject2.getColor();
  context.fillRect(barObject2.getOriginX(), 450 - barObject2.getHeight(),
                            BAR_WIDTH, barObject2.getHeight());  
  } else
  {
    // Copy contents of offscreen canvas to canvas
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(offscreenCanvas, 0, 0);

    context.fillStyle = barObject1.getColor();
    context.fillRect(barObject1.getOriginX(), 450 - barObject1.getHeight(),
                              BAR_WIDTH, barObject1.getHeight());
    context.fillStyle = barObject2.getColor();
    context.fillRect(barObject2.getOriginX(), 450 - barObject2.getHeight(),
                              BAR_WIDTH, barObject2.getHeight());

    highlightTimer++;

    if (highlightTimer > HIGHLIGHT_LIMIT)
    {
      animateFinished = true;
      // barObject1.setColor('rgb(255, 0, 255)');    
      // barObject2.setColor('rgb(255, 0, 255)');
      // pivotObject.setColor('rgb(255, 0, 255)');           
    }

  }

  return animateFinished;

}

function startAnimation ()
{
  // console.log("startAnimation() method");
  console.log("length:",listArray.length);
  console.log(item);
  if(item == undefined)
  {
    if (listArray.length > 0)
    {
      item = listArray.shift();
    } else
    {
      // console.log("playing is undefined");
      playing = false;
      return;
    }
  }

  if (animateItem())
  {
    if (listArray.length > 0)
    {
      console.log("get new item");
      item = listArray.shift();
      initializedOff = false;
      initEndValues = false;
      animateFinished = false;
      highlightStart = false;
    } else
    {
      // console.log("animateItem is true");
      playing = false;
      // endItem = item;
      // console.log(endItem);
      item = undefined;
    }
  }

  if(playing)
  {
    // console.log("requestAnimationFrame in startAnimation()");
    requestAnimationFrame(startAnimation);
  }

  // console.log("end of startAnimation()");
}

function main ()
{
  numbers = [];
  ourArray = [];

  for (let i = 1; i < NUM_ITEMS + 1; i ++)
  {
    numbers.push(i);
  }

  for (let i = 0; i < NUM_ITEMS; i++)
  {
    randomIndex = randInt(0, numbers.length);
    ourArray[i] = numbers[randomIndex];
    numbers.splice(randomIndex, 1);
  }
  
  console.log(ourArray);
  // console.log(ourArray);
  barList = createBarList(ourArray, BAR_WIDTH);
 
  quickSort(ourArray);
  console.log(ourArray);
  console.log(barList);
  console.log(listArray);
  
  // return;
  // item = listArray.shift();
  console.log(item);
  playing = true;
  requestAnimationFrame(startAnimation);

  console.log(backupListArray);
  // console.log(endItem);
  // console.log(barList);
}

main()

// let ourArray = [34, 12, 1, 6, 77, 18, 87, 22];
// console.log(ourArray);
// quickSort(ourArray);
// console.log(ourArray);
