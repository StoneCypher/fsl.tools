
/********
 *
 *  Returns the arithmetic double of the input number, or throws if not a number
 *
 *  @summary Double a number
 *  @category stub
 *
 *  @param {number} x - The input value to be doubled
 *
 *  @returns {number} The doubled value
 *
 *  @example
 *  This will work:
 *  ```ts
 *    console.log( double(3) );  // should print "6"
 *  ```
 *  This will throw:
 *  ```ts
 *    console.log( double('three') );  // should explode
 *  ```
 *
 *  @since Introduced in v0.3.0, Mar 22 2026
 *  @author John Haugeland
 *
 *  @throws TypeError if `typeof x !== 'number'`
 *
 *  @privateRemarks
 *  This function is here to show that building, bundling, and testing are working.  It also serves to remind us what
 *  typedoc arguments are being used.  Destroy this file and this function, de-export this function from index, and
 *  remove the `spec`, `stoch`, and `mutat` tests for double before proceeding.
 *
 */

export function double(x: number): number {

  if (typeof x !== 'number') {
    throw new TypeError('input to `double/1` must be a `number`');
  }

  return x*2;

}





// not counted against doc coverage because not in api as exported by index
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function unhandled_internal(): void {}

// counted against doc coverage because exported by index
// eslint-disable-next-line @typescript-eslint/no-empty-function
export function unhandled_external(): void {}
