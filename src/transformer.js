/**
 * Open the following test webstrate for visual tests of transformer.js
 * {@link http://zaxxon.cs.au.dk/transformer-tests}
 */
;
(function(exports) {

    // Module object holding private variables.
    const module = {};

    console.warn(`The transformer.js library is very much in flux. Do not use this API if you are not willing to adjust your code to the yet frequently changing Transformer API! Skål!`);

    Number.prototype.toFixedNumber = function(x, base) {
        var pow = Math.pow(base || 10, x);
        return +(Math.round(this * pow) / pow);
    };

    /**
     * Polyfill for requestAnimationFrame.
     * 
     * @memberOf TransformStack
     */
    (function() {
        var lastTime = 0;
        var vendors = ['ms', 'moz', 'webkit', 'o'];
        for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] ||
                window[vendors[x] + 'CancelRequestAnimationFrame'];
        }

        if (!window.requestAnimationFrame)
            window.requestAnimationFrame = function(callback, element) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function() { callback(currTime + timeToCall); },
                    timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };

        if (!window.cancelAnimationFrame)
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
    }());

    /**
     * A simple point class.
     * 
     * @class Point
     */
    class Point {

        /**
         * Creates an instance of Point.
         * 
         * @param {any} x The x value.
         * @param {any} y The y value.
         * 
         * @memberOf Point
         */
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }

        /**
         * Returns the string representation of the point.
         * 
         * @returns The string representation of the point.
         * 
         * @memberOf Point
         */
        toString() {
            return `${Point.name} [x=${this.x},y=${this.y}]`;
        }
    }

    /**
     * The matrix class provides convenient functions for affine transformations, e.g., translate, rotate, and
     * scale. It also offers functions like matrix multiplication or creating an inverse matrix.
     * 
     * @class Matrix
     */
    class Matrix {

        /**
         * Creates an instance of Matrix. The matrix needs to be a two-dimensional array. The first index will
         * be rows and the second index will be columns. The array needs to be in a n x m format. For example,
         * an array [[1, 2, 3], [4, 5, 6], [7, 8 ,9]] will result in the following matrix:
         * 
         * 1   2   3
         * 4   5   6
         * 7   8   9
         * 
         * @param {any} M A two-dimensional array.
         * 
         * @memberOf Matrix
         */
        constructor(M) {

            if (typeof M === 'undefined' || !Array.isArray(M)) {
                throw new Error(`first parameter needs to be a two-dimensional array`);
            }
            this.matrix = M;
        }

        /**
         * Sets the matrix. The matrix needs to be a two-dimensional array. The first index will be rows and
         * the second index will be columns. The array needs to be in a n x m format.
         * 
         * @memberOf Matrix
         */
        set matrix(matrix) {
            this._matrix = matrix;
            this._rows = matrix.length;
            this._columns = matrix[0].length;
        }

        /**
         * Returns the matrix as a two-dimensional array.
         * 
         * @memberOf Matrix
         */
        get matrix() {
            return this._matrix;
        }

        /**
         * Returns number of rows of matrix.
         * 
         * @readonly
         * 
         * @memberOf Matrix
         */
        get rows() {
            return this._rows;
        }

        /**
         * Returns number of columns of matrix.
         * 
         * @readonly
         * 
         * @memberOf Matrix
         */
        get columns() {
            return this._columns;
        }

        get a() {
            return this.matrix[0][0];
        }

        get b() {
            return this.matrix[1][0];
        }

        get c() {
            return this.matrix[0][1];
        }

        get d() {
            return this.matrix[1][1];
        }

        get tx() {
            return this.matrix[0][2];
        }

        get ty() {
            return this.matrix[1][2];
        }

        get angle() {
            const rad = Math.atan2(this.b, this.a);
            return (rad * 180) / Math.PI;
        }

        get scaleX() {
            return this.a;
        }

        get scaleY() {
            return this.d;
        }

        /**
         * Translates the matrix by tx and ty.
         * 
         * @param {Number} tx The translation value in x.
         * @param {Number} ty The translation value in y.
         * 
         * @memberOf Matrix
         */
        translate(tx, ty, truncate = true) {
            const M = this.multiply(new Matrix([
                [1, 0, tx],
                [0, 1, ty],
                [0, 0, 1],
            ]), truncate).matrix;

            this.matrix = M;
        }

        /**
         * Rotates the matrix by angle. The rotation value has to be in degrees.
         * 
         * @param {Number} angle The rotation value in degrees.
         * 
         * @memberOf Matrix
         */
        rotate(angle, truncate = true) {
            const rad = angle * (Math.PI / 180);
            const costheta = Math.cos(rad);
            const sintheta = Math.sin(rad);

            const M = this.multiply(new Matrix([
                [costheta, -sintheta, 0],
                [sintheta, costheta, 0],
                [0, 0, 1],
            ]), truncate).matrix;

            this.matrix = M;
        }

        /**
         * Scales the matrix by sx and sy.
         * 
         * @param {Number} sx The scale value in x.
         * @param {Number} sy The scale value in y.
         * 
         * @memberOf Matrix
         */
        scale(sx, sy, truncate = true) {
            const M = this.multiply(new Matrix([
                [sx, 0, 0],
                [0, sy, 0],
                [0, 0, 1],
            ]), truncate).matrix;

            this.matrix = M;
        }

        /**
         * Skwes the matrix in degX and degY.
         * 
         * @param {Number} degX The skew value in x in degrees.
         * @param {Number} degY The skew value in y in degrees.
         * 
         * @memberOf Matrix
         */
        skew(degX, degY, truncate = true) {
            const radX = degX * (Math.PI / 180);
            const radY = degY * (Math.PI / 180);
            const x = Math.tan(radX);
            const y = Math.tan(radY);

            const M = this.multiply(new Matrix([
                [1, x, 0],
                [y, 1, 0],
                [0, 0, 1],
            ]), truncate).matrix;

            this.matrix = M;
        }

        /**
         * Multiplies a given matrix with this matrix and returns the result as new matrix instance. In order
         * to perform the matrix multiplication, rows of matrix M1 need to match columns of matrix M2 as well
         * as columns of matrix M1 need to match rows of matrix M2.
         * 
         * @param {any} M The matrix used to multiply with this matrix.
         * @returns The multipied matrix.
         * 
         * @memberOf Matrix
         */
        multiply(M, truncate = true) {

            if (this.rows !== M.columns || this.columns !== M.rows) {
                throw new Error(`cannot multiply because matrix dimensions do not match (n*m !== m*n)`);
            }

            const m = [];
            const m1 = this.matrix;
            const m2 = M.matrix;
            for (let i = 0; i < m1.length; i++) {
                m[i] = [];
                for (let j = 0; j < m2[0].length; j++) {
                    let sum = 0;
                    for (let k = 0; k < m1[0].length; k++) {
                        sum += m1[i][k] * m2[k][j];
                    }
                    // m[i][j] = sum;
                    m[i][j] = truncate ? parseFloat(sum.toFixed(3)) : sum;
                }
            }

            return new Matrix(m);
        }

        /**
         * Multiplies this matrix by the given matrix and replaces this matrix by the resulting matrix.
         * 
         * @param {any} The matrix used to multiply with this matrix.
         * 
         * @memberOf Matrix
         */
        multiplyBy(M) {
            // const m = this.multiply(M).matrix;
            const m = M.multiply(this).matrix;
            this.matrix = m;
        }

        /**
         * Creates a copy of the matrix.
         * 
         * @returns The copy of this matrix.
         * 
         * @memberOf Matrix
         */
        copy() {
            const m = this.matrix;
            const copyM = JSON.parse(JSON.stringify(m));
            return new Matrix(copyM);
        }

        /**
         * Returns the inverse matrix of this matrix.
         * 
         * http://blog.acipo.com/matrix-inversion-in-javascript/
         * 
         * @readonly
         * 
         * @memberOf Matrix
         */
        get inverse() {
            // I use Guassian Elimination to calculate the inverse:
            // (1) 'augment' the matrix (left) by the identity (on the right)
            // (2) Turn the matrix on the left into the identity by elemetry row ops
            // (3) The matrix on the right is the inverse (was the identity matrix)
            // There are 3 elemtary row ops: (I combine b and c in my code)
            // (a) Swap 2 rows
            // (b) Multiply a row by a scalar
            // (c) Add 2 rows

            const M = this.matrix;

            //if the matrix isn't square: exit (error)
            if (M.length !== M[0].length) {
                throw new Error(`matrix is not squared`);
            }

            //create the identity matrix (I), and a copy (C) of the original
            var i = 0,
                ii = 0,
                j = 0,
                dim = M.length,
                e = 0,
                t = 0;
            var I = [],
                C = [];
            for (i = 0; i < dim; i += 1) {
                // Create the row
                I[I.length] = [];
                C[C.length] = [];
                for (j = 0; j < dim; j += 1) {

                    //if we're on the diagonal, put a 1 (for identity)
                    if (i == j) {
                        I[i][j] = 1;
                    } else {
                        I[i][j] = 0;
                    }

                    // Also, make the copy of the original
                    C[i][j] = M[i][j];
                }
            }

            // Perform elementary row operations
            for (i = 0; i < dim; i += 1) {
                // get the element e on the diagonal
                e = C[i][i];

                // if we have a 0 on the diagonal (we'll need to swap with a lower row)
                if (e == 0) {
                    //look through every row below the i'th row
                    for (ii = i + 1; ii < dim; ii += 1) {
                        //if the ii'th row has a non-0 in the i'th col
                        if (C[ii][i] != 0) {
                            //it would make the diagonal have a non-0 so swap it
                            for (j = 0; j < dim; j++) {
                                e = C[i][j]; //temp store i'th row
                                C[i][j] = C[ii][j]; //replace i'th row by ii'th
                                C[ii][j] = e; //repace ii'th by temp
                                e = I[i][j]; //temp store i'th row
                                I[i][j] = I[ii][j]; //replace i'th row by ii'th
                                I[ii][j] = e; //repace ii'th by temp
                            }
                            //don't bother checking other rows since we've swapped
                            break;
                        }
                    }
                    //get the new diagonal
                    e = C[i][i];
                    //if it's still 0, not invertable (error)
                    if (e == 0) {
                        throw new Error(`matrix is not invertable`);
                    }
                }

                // Scale this row down by e (so we have a 1 on the diagonal)
                for (j = 0; j < dim; j++) {
                    C[i][j] = C[i][j] / e; //apply to original matrix
                    I[i][j] = I[i][j] / e; //apply to identity
                }

                // Subtract this row (scaled appropriately for each row) from ALL of
                // the other rows so that there will be 0's in this column in the
                // rows above and below this one
                for (ii = 0; ii < dim; ii++) {
                    // Only apply to other rows (we want a 1 on the diagonal)
                    if (ii == i) { continue; }

                    // We want to change this element to 0
                    e = C[ii][i];

                    // Subtract (the row above(or below) scaled by e) from (the
                    // current row) but start at the i'th column and assume all the
                    // stuff left of diagonal is 0 (which it should be if we made this
                    // algorithm correctly)
                    for (j = 0; j < dim; j++) {
                        C[ii][j] -= e * C[i][j]; //apply to original matrix
                        I[ii][j] -= e * I[i][j]; //apply to identity
                    }
                }
            }

            //we've done all operations, C should be the identity
            //matrix I should be the inverse:
            return new Matrix(I);
        }

        toJSON() {
            return JSON.stringify(this.matrix);
        }

        static fromJSON(json) {
            const matrix = JSON.parse(json);
            return new Matrix(matrix);
        }

        /**
         * Converts the matrix to a CSS matrix transform. It respects whether the matrix should be a
         * CSS matrix() or CSS matrix3d().
         * 
         * @returns The CSS transform.
         * 
         * @memberOf Matrix
         */
        toCss(fixed = true) {

            const M = this.matrix;

            const getFixedValue = (row, column) => {
                if (fixed) {
                    return parseFloat(M[row][column].toFixed(3));
                }
                return M[row][column];
            }

            if (this.rows === 3 && this.columns === 3) {
                if (this.equals(Matrix.identity(3))) {
                    return "none";
                }

                const a = getFixedValue(0, 0);
                const b = getFixedValue(1, 0);
                const c = getFixedValue(0, 1);
                const d = getFixedValue(1, 1);
                const tx = getFixedValue(0, 2);
                const ty = getFixedValue(1, 2);

                return `matrix(${a}, ${b}, ${c}, ${d}, ${tx}, ${ty})`;
            }

            if (this.equals(Matrix.identity(4))) {
                return "none";
            }

            const a1 = getFixedValue(0, 0);
            const b1 = getFixedValue(1, 0);
            const c1 = getFixedValue(2, 0);
            const d1 = getFixedValue(3, 0);
            const a2 = getFixedValue(0, 1);
            const b2 = getFixedValue(1, 1);
            const c2 = getFixedValue(2, 1);
            const d2 = getFixedValue(3, 1);
            const a3 = getFixedValue(0, 2);
            const b3 = getFixedValue(1, 2);
            const c3 = getFixedValue(2, 2);
            const d3 = getFixedValue(3, 2);
            const a4 = getFixedValue(0, 3);
            const b4 = getFixedValue(1, 3);
            const c4 = getFixedValue(2, 3);
            const d4 = getFixedValue(3, 3);

            return `matrix3d(${a1}, ${b1}, ${c1}, ${d1}, ${a2}, ${b2}, ${c2}, ${d2}, ${a3}, ${b3}, ${c3}, ${d3}, ${a4}, ${b4}, ${c4}, ${d4})`;
        }

        /**
         * Returns true if matrix M equals to this matrix.
         * 
         * @param {any} M A matrix to compare to.
         * @returns True if this matrix and matrix M are equal.
         * 
         * @memberOf Matrix
         */
        equals(M) {
            return Matrix.equals(this, M);
        }

        /**
         * Returns true if both matrix have the same matrix values, false otherwise.
         * 
         * @static
         * @param {any} M1 Matrix 1.
         * @param {any} M2 Matrix 2.
         * @returns True if matrix M1 and M2 are equal.
         * 
         * @memberOf Matrix
         */
        static equals(M1, M2) {
            return JSON.stringify(M1.matrix) === JSON.stringify(M2.matrix);
        }

        /**
         * Creates an n x n identity matrix.
         * 
         * @static
         * @param {any} n The number of rows and columns to create this n x n identity matrix.
         * @returns The identity matrix.
         * 
         * @memberOf Matrix
         */
        static identity(n) {

            let m = [];
            for (let row = 0; row < n; row++) {
                let mRow = m[row] = [];

                for (let col = 0; col < n; col++) {
                    mRow[col] = col === row ? 1 : 0
                }
            }

            return new Matrix(m);
        }

        /**
         * Creates a matrix from a DOM element (e.g., a HTMLElement or a SVGElement).
         * 
         * @static
         * @param {any} element A DOM element from which the matrix is created from.
         * @returns The matrix.
         * 
         * @memberOf Matrix
         */
        static from(element) {

            let rawTransform = "none";

            if (element instanceof SVGElement) {
                rawTransform = element.getAttribute("transform");

                // SAFARI does not return a proper transform with window.getComputedStyle for SVGElement.
                // TODO This is a nasty workaround.
                if (!rawTransform || rawTransform === "") {
                    rawTransform = element.style.transform;
                }
            } else if (element.nodeType === 1) {
                rawTransform = window.getComputedStyle(element).transform;
            }

            if (rawTransform === "" || rawTransform === "none") {
                return Matrix.identity(3);
            } else {
                const regEx = /([-+]?[\d\.]+)/g;

                // console.log('rawTransform %o', rawTransform);

                if (rawTransform.indexOf("matrix3d") > -1) {
                    // throw new Error(`matrix3d transformation not yet supported`);

                    // https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix3d
                    const a1 = parseFloat(regEx.exec(rawTransform)[0]);
                    const b1 = parseFloat(regEx.exec(rawTransform)[0]);
                    const c1 = parseFloat(regEx.exec(rawTransform)[0]);
                    const d1 = parseFloat(regEx.exec(rawTransform)[0]);
                    const a2 = parseFloat(regEx.exec(rawTransform)[0]);
                    const b2 = parseFloat(regEx.exec(rawTransform)[0]);
                    const c2 = parseFloat(regEx.exec(rawTransform)[0]);
                    const d2 = parseFloat(regEx.exec(rawTransform)[0]);
                    const a3 = parseFloat(regEx.exec(rawTransform)[0]);
                    const b3 = parseFloat(regEx.exec(rawTransform)[0]);
                    const c3 = parseFloat(regEx.exec(rawTransform)[0]);
                    const d3 = parseFloat(regEx.exec(rawTransform)[0]);
                    const a4 = parseFloat(regEx.exec(rawTransform)[0]);
                    const b4 = parseFloat(regEx.exec(rawTransform)[0]);
                    const c4 = parseFloat(regEx.exec(rawTransform)[0]);
                    const d4 = parseFloat(regEx.exec(rawTransform)[0]);

                    return new Matrix([
                        [a1, a2, a3, a4],
                        [b1, b2, b3, b4],
                        [c1, c2, c3, c4],
                        [d1, d2, d3, d4]
                    ]);
                } else {

                    // https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix
                    const a = parseFloat(regEx.exec(rawTransform)[0]);
                    const b = parseFloat(regEx.exec(rawTransform)[0]);
                    const c = parseFloat(regEx.exec(rawTransform)[0]);
                    const d = parseFloat(regEx.exec(rawTransform)[0]);
                    const tx = parseFloat(regEx.exec(rawTransform)[0]);
                    const ty = parseFloat(regEx.exec(rawTransform)[0]);

                    return new Matrix([
                        [a, c, tx],
                        [b, d, ty],
                        [0, 0, 1]
                    ]);
                }
            }
        }

        /**
         * Returns the matrix in a human readable format. 
         * 
         * @returns The matrix in string format.
         * 
         * @memberOf Matrix
         */
        toString() {
            return `Matrix [rows=${this.rows},columns=${this.columns},matrix=${JSON.stringify(this.matrix)}]`;
        }
    }

    /**
     * The base class for a transforms.
     * 
     * @class Transform
     */
    class Transform {

        /**
         * Creates an instance of Transform. It will create an instance with a default identity matrix.
         * 
         * @memberOf Transform
         */
        constructor() {
            this.matrix = Matrix.identity(3);
            this._centerPoint = new Point(0, 0);
        }

        get centerPoint() {
            return this._centerPoint;
        }

        /**
         * Applies this transform to the matrix given as parameter.
         * 
         * @param {any} matrix The matrix to which this transform will be applied.
         * 
         * @memberOf Transform
         */
        apply(matrix) {
            const centerPointMatrix = Matrix.identity(3);
            centerPointMatrix.translate(this._centerPoint.x, this._centerPoint.y);

            matrix.multiplyBy(centerPointMatrix.inverse);
            matrix.multiplyBy(this.matrix);
            matrix.multiplyBy(centerPointMatrix);
        }

        /**
         * Unapplies this transformation from the matrix given as paramter.
         * 
         * @param {any} matrix The matrix from which this transform will be unapplied.
         * 
         * @memberOf Transform
         */
        unapply(matrix) {
            const centerPointMatrix = Matrix.identity(3);
            centerPointMatrix.translate(this._centerPoint.x, this._centerPoint.y);

            matrix.multiplyBy(centerPointMatrix.inverse);
            // console.log('matrix1 %o', this.matrix.toString());
            matrix.multiplyBy(this.matrix.inverse);
            // console.log('matrix2 %o', this.matrix.toString());
            matrix.multiplyBy(centerPointMatrix);
        }

        get inverse() {
            throw new Error(`inverse not implemented for ${this.constructor.name}`);
        }

        reset() {
            this._centerPoint.x = 0;
            this._centerPoint.y = 0;
        }

        static from(matrix) {
            throw new Error(`inverse not implemented for transform`);
        }
    }



    /**
     * The translate transform.
     * 
     * @class TranslateTransform
     * @extends {Transform}
     */
    class TranslateTransform extends Transform {

        /**
         * Creates an instance of TranslateTransform. It will translate a matrix by tx and ty.
         * 
         * @param {any} tx The translate value in x.
         * @param {any} ty The translate value in y.
         * 
         * @memberOf TranslateTransform
         */
        constructor(x = 0, y = 0) {
            super();
            this.set(x, y);
        }

        set(x, y) {
            this.x = x;
            this.y = y;

            this.matrix = new Matrix([
                [1, 0, x],
                [0, 1, y],
                [0, 0, 1]
            ]);
        }

        get inverse() {
            return TranslateTransform.from(this.matrix.inverse);
        }

        update(matrix) {

            if (!(matrix instanceof Matrix)) {
                throw new Error(`matrix needs to be of type ${Matrix.name}`);
            }

            const M = matrix;

            // http://math.stackexchange.com/questions/13150/extracting-rotation-scale-values-from-2d-transformation-matrix
            const tx = M.tx;
            const ty = M.ty;

            this.set(tx, ty);
        }

        /**
         * Reset translate transform.
         * 
         * @memberOf TranslateTransform
         */
        reset() {
            this.set(0, 0);
            super.reset();
        }

        static from(matrix) {
            const transform = new TranslateTransform();
            transform.update(matrix);
            return transform;
        }

        toString() {
            return `${this.constructor.name} [x=${this.x},y=${this.y}]`;
        }
    }

    /**
     * The rotate transform.
     * 
     * @class RotateTransform
     * @extends {Transform}
     */
    class RotateTransform extends Transform {

        /**
         * Creates an instance of RotateTransform. It will rotate a matrix by an angle [in degrees].
         * 
         * @param {any} deg The rotate value in degrees.
         * 
         * @memberOf RotateTransform
         */
        constructor(angle = 0) {
            super();
            this.set(angle);
        }

        set(angle) {
            this.angle = angle;

            const rad = angle * (Math.PI / 180);
            const costheta = Math.cos(rad);
            const sintheta = Math.sin(rad);

            this.matrix = new Matrix([
                [costheta, -sintheta, 0],
                [sintheta, costheta, 0],
                [0, 0, 1]
            ]);
        }

        get inverse() {
            return RotateTransform.from(this.matrix.inverse);
        }

        update(matrix) {

            if (!(matrix instanceof Matrix)) {
                throw new Error(`matrix needs to be of type ${Matrix.name}`);
            }

            const M = matrix;

            // http://math.stackexchange.com/questions/13150/extracting-rotation-scale-values-from-2d-transformation-matrix
            // const psi1 = Math.atan2(-M.b, M.a);
            // const psi2 = Math.atan2(M.c, M.d);

            // if (psi1 !== psi2) {
            //     throw new Error(`matrix error ${psi1} !== ${psi2}`);
            // }

            // const angle = (psi2 * 180) / Math.PI;

            const rad = Math.atan2(M.b, M.a);
            const angle = (rad * 180) / Math.PI;

            this.set(angle);
        }

        /**
         * Reset rotate transform.
         * 
         * @memberOf RotateTransform
         */
        reset() {
            this.set(0);
            super.reset();
        }

        static from(matrix) {
            const transform = new RotateTransform();
            transform.update(matrix);
            return transform;
        }

        toString() {
            return `${this.constructor.name} [angle=${this.angle}]`;
        }
    }

    /**
     * The scale transform.
     * 
     * @class ScaleTransform
     * @extends {Transform}
     */
    class ScaleTransform extends Transform {

        /**
         * Creates an instance of ScaleTransform. It will scale a matrix by x and y.
         * 
         * @param {any} x The scale factor in x.
         * @param {any} y The scale factor in y.
         * 
         * @memberOf ScaleTransform
         */
        constructor(x = 1.0, y = 1.0) {
            super();
            this.set(x, y);
        }

        set(x, y) {
            this.x = x;
            this.y = y;

            this.matrix = new Matrix([
                [x, 0, 0],
                [0, y, 0],
                [0, 0, 1],
            ]);
        }

        get inverse() {
            return ScaleTransform.from(this.matrix.inverse);
        }

        update(matrix) {

            if (!(matrix instanceof Matrix)) {
                throw new Error(`matrix needs to be of type ${Matrix.name}`);
            }

            const M = matrix;

            // http://math.stackexchange.com/questions/13150/extracting-rotation-scale-values-from-2d-transformation-matrix
            // const sx = Math.sign(M.a) * Math.sqrt(Math.pow(M.a, 2) + Math.pow(M.b, 2));
            // const sy = Math.sign(M.d) * Math.sqrt(Math.pow(M.c, 2) + Math.pow(M.d, 2));

            const sx = Math.sqrt(Math.pow(M.a, 2) + Math.pow(M.b, 2));
            const sy = Math.sqrt(Math.pow(M.c, 2) + Math.pow(M.d, 2));

            this.set(sx, sy);
        }

        /**
         * Reset scale transform.
         * 
         * @memberOf ScaleTransform
         */
        reset() {
            this.set(1, 1);
            super.reset();
        }

        static from(matrix) {
            const transform = new ScaleTransform();
            transform.update(matrix);
            return transform;
        }

        toString() {
            return `${this.constructor.name} [x=${this.x},y=${this.y}]`;
        }
    }

    class TransformOrigin extends Transform {

        constructor(element, ratioX = 0, ratioY = 0) {
            super();

            if (!element) {
                throw new Error(`element is null or undefined`);
            }

            this.element = element;
            this.set(ratioX, ratioY);
        }

        set(ratioX, ratioY) {
            this.ratioX = ratioX;
            this.ratioY = ratioY;
        }


        get inverse() {
            return TransformOrigin.from(this.element, this.matrix.inverse);
        }

        /**
         * Applies this transform to the matrix given as parameter.
         * 
         * @param {any} matrix The matrix to which this transform will be applied.
         * 
         * @memberOf TransformOrigin
         */
        apply(matrix) {

            // TODO Remove if a notifier to property clientWidth/clientHeight change has been
            // attached to element. Until then always reforce calculation of transform origin.
            const x = this.element.clientWidth * this.ratioX;
            const y = this.element.clientHeight * this.ratioY;

            this.matrix = new Matrix([
                [1, 0, x],
                [0, 1, y],
                [0, 0, 1]
            ]);

            super.apply(matrix);
        }

        /**
         * Unapplies this transformation from the matrix given as paramter.
         * 
         * @param {any} matrix The matrix from which this transform will be unapplied.
         * 
         * @memberOf TransformOrigin
         */
        unapply(matrix) {

            // TODO Remove if a notifier to property clientWidth/clientHeight change has been
            // attached to element. Until then always reforce calculation of transform origin.
            const x = this.element.clientWidth * this.ratioX;
            const y = this.element.clientHeight * this.ratioY;

            this.matrix = new Matrix([
                [1, 0, x],
                [0, 1, y],
                [0, 0, 1]
            ]);

            super.unapply(matrix);
        }

        update(matrix) {

            if (!(matrix instanceof Matrix)) {
                throw new Error(`matrix needs to be of type ${Matrix.name}`);
            }

            const M = matrix;

            this.set(M.tx, M.ty);
        }

        /**
         * Reset transform origin.
         * 
         * @memberOf TransformOrigin
         */
        reset() {
            this.set(0, 0);
            super.reset();
        }

        static from(element, matrix) {
            const transform = new TransformOrigin(element);
            transform.update(matrix);
            return transform;
        }

        toString() {
            return `${this.constructor.name} [ratioX=${this.ratioX}, ratioY=${this.ratioY}]`;
        }
    }

    /**
     * The transform group can hold multiple transform of type TranslateTransform, RotateTransform, ScaleTransform, or
     * even another TransformGroup. When the apply function is called, it will apply all added transform in the exact
     * order in which they have been added to the transform group. The unapply function will unapply all transform in
     * the reverse order in which they have been added to the transform group.
     * 
     * @class TransformGroup
     * @extends {Transform}
     */
    class TransformGroup extends Transform {

        /**
         * Creates an instance of TransformGroup.
         * 
         * @memberOf TransformGroup
         */
        constructor() {
            super();

            this.transforms = [];
        }

        /**
         * Add a transform (e.g., TranslateTransform, RotateTransform, or ScaleTransform) to the transform
         * group. All transforms will be applied in the order they were added to the transform group. If a
         * transform group is unapplied, it will unapply all transforms in reverse order.
         * 
         * @param {Transform} transform A transform of type Transform (e.g., TranslateTransform, RotateTransform,
         * or ScaleTransform). Eventually, a TransformGroup can also be added.
         * 
         * @throws {Error} Throws an error if transform is not of type Transform.
         * 
         * @memberOf TransformGroup
         */
        add(transform, inverse = false) {

            // Check if transform is of proper type.
            if (!(transform instanceof Transform)) {
                throw new Error(`transform needs to be of type ${Transform.name}`);
            }

            // Add transform to transforms.
            this.transforms.push({
                inverse,
                transform
            });
        }

        /**
         * Remove a transform from this transform group. The transform has to be part of the transform group,
         * otherwise an error will be thrown.
         * 
         * @param {Transform} transform
         * 
         * @throws {Error} Throws an error if transform is not of type Transform and if transform is not part
         * of transform group.
         * 
         * @memberOf TransformGroup
         */
        remove(transform) {

            // Check if transform is of proper type.
            if (!(transform instanceof Transform)) {
                throw new Error(`transform needs to be of type ${Transform.name}`);
            }

            // Check if transform is part of transform group.
            if (!this.transforms.contains(transform)) {
                throw new Error(`transform is not part of this transform group`);
            }

            // Remove transform from transform group.
            const idx = this.transforms.indexOf(transform);
            this.transforms.splice(idx, 1);
        }

        /**
         * Applies all transforms in the order in which they have been added to this transform group. The
         * TransformGroup#apply function is specified in Transform ({@see Transform#apply}).
         * 
         * @param {any} matrix The matrix to which transforms are applied.
         * 
         * @memberOf TransformGroup
         */
        apply(matrix, type = null) {

            // Apply each transform to the matrix.
            this.transforms.forEach(({ transform, inverse }) => {
                if (type && !(transform instanceof type) && !(transform instanceof TransformGroup)) {
                    return;
                }
                // console.log('apply inverse=%o transform=%o', inverse, transform.toString());
                inverse ? transform.unapply(matrix, type) : transform.apply(matrix, type);
            });
        }

        /**
         * Unapplies all transforms in reverse order in which they have been added to this transform group. The
         * TransformGroup#unapply function is specified in Transform ({@see Transform#unapply}).
         * 
         * @param {any} matrix The matrix from which the transforms are unapplied.
         * 
         * @memberOf TransformGroup
         */
        unapply(matrix, type = null) {

            // Unapply each transform from the matrix in reverse order.
            this.transforms.slice().reverse().forEach(({ transform, inverse }) => {
                if (type && !(transform instanceof type) && !(transform instanceof TransformGroup)) {
                    return;
                }
                // console.log('unapply inverse=%o transform=%o', inverse, transform.toString());
                inverse ? transform.apply(matrix, type) : transform.unapply(matrix, type);
            });
        }

        /**
         * Reset transform group.
         * 
         * @memberOf TransformGroup
         */
        reset() {
            this.transforms.forEach(({ transform }) => {
                transform.reset();
            });
        }

        /**
         * Transform group to string.
         * 
         * @returns Transform group in string representation.
         * 
         * @memberOf TransformGroup
         */
        toString() {
            return `${this.constructor.name} [transforms=[${this.transforms.map(({transform, inverse}) => {
                    return inverse ? transform.inverse.toString() : transform.toString();
                })
                .join(", ")}]]`;
        }
    }

    /**
     * The transform stack builds the base object responsible for transforming a DOM element. It takes an
     * element as constructor parameter and binds itself to this element. The transform stack allows push
     * and pop of transforms. A transform is immediately applied on the element and poping will immediately
     * unapply the transform from the element.
     * 
     * @class Transformer
     */
    class Transformer {

        /**
         * Creates an instance of Transformer. It takes a DOM element as contstructor parameter to which
         * this transform stack will bind itself. The transform stack will receive the elements current 
         * transform as matrix, which will be used to apply transforms.
         * 
         * @param {any} element A DOM element to which transforms will be applied. 
         * 
         * @memberOf Transformer
         */
        constructor(element, callback, debug = true) {

            // Element needs to be in DOM to get its clientWidth and clientHeight.
            if (!element.parentElement) {
                throw new Error(`Element has no parent element. Is the element in the DOM?`);
            }

            // Check if callback is set and if it is a function.
            if (callback && typeof callback !== "function") {
                throw new Error(`callback needs to be a function`);
            }

            this.element = element;
            this.element.transformer = this;
            this.callback = callback;
            this.updateInProgress = false;

            // Make sure the element is positioned absolute and its origin is at point (0, 0, 0).
            this.element.style.position = "absolute";
            this.element.style.transformOrigin = "0 0 0";

            let matrix = this.getTransformMatrix();

            // this._transformOrigin = new TransformOrigin(element);
            this._scaleTransform = ScaleTransform.from(matrix);
            this._rotateTransform = RotateTransform.from(matrix);
            this._translateTransform = TranslateTransform.from(matrix);

            const transformGroup = new TransformGroup();
            transformGroup.add(this._rotateTransform);
            transformGroup.add(this._scaleTransform);
            transformGroup.add(this._translateTransform);

            this._transforms = transformGroup;

            // Listen for Webstrates updates.
            // this.listenForUpdates();

            if (debug) {

                let visualTransformOrigin = this.element.querySelector(':scope > .transform-origin-point');

                if (!visualTransformOrigin) {
                    // Create visual transform origin
                    visualTransformOrigin = document.createElement("transient");
                    visualTransformOrigin.setAttribute("class", "transform-origin-point");
                    element.appendChild(visualTransformOrigin);
                }

                // const _transformOriginSet = this.transformOrigin.set;
                // this.transformOrigin.set = function(x, y) {
                //     visualTransformOrigin.style.zIndex = "99999";
                //     visualTransformOrigin.style.position = `absolute`;
                //     visualTransformOrigin.style.left = `${x * 100}%`;
                //     visualTransformOrigin.style.top = `${y * 100}%`;
                //     visualTransformOrigin.style.transform = `translate(-50%, -50%)`;
                //     _transformOriginSet.apply(this, arguments);
                // }
            }
        }

        /**
         * Get transform matrix from element transform.
         * 
         * @returns Element transform matrix.
         * 
         * @memberOf Transformer
         */
        getTransformMatrix() {
            return Matrix.from(this.element);
        }

        /**
         * Refresh transfroms from element transform.
         * 
         * @memberOf Transformer
         */
        refreshTransforms() {
            const matrix = this.getTransformMatrix();
            this._translateTransform.update(matrix);
            this._rotateTransform.update(matrix);
            this._scaleTransform.update(matrix);
        }

        /**
         * Reapplies all transforms again. This function should be used when any of the transforms in the transform
         * chain changed.
         * 
         * @memberOf TransformStack
         */
        reapplyTransforms(updateElementsTransform = true) {
            let matrix = Matrix.identity(3);

            if (this.element.renderTransform) {
                this.element.renderTransform.apply(matrix);
            }
            this._transforms.apply(matrix);

            this.elementMatrix = matrix;

            if (updateElementsTransform) {
                // Update element transform.
                return this.updateElement();
            } else {
                return new Promise((resolve, reject) => {
                    resolve();
                });
            }
        }

        /**
         * Merge render transform to main transform and reset
         * render transform on success.
         * 
         * @memberOf Transformer
         */
        complete() {
            if (this.element.renderTransform) {
                this.refreshTransforms();
                this.element.renderTransform.reset();
            }
        }

        /**
         * Updates the element's transform matrix.
         * 
         * @returns A promise resolved when element updated successfully.
         * 
         * @memberOf TransformStack
         */
        updateElement() {

            return new Promise((resolve, reject) => {

                if (this.updateInProgress) {
                    // reject(`update already in progress`);
                    // resolve(this.elementMatrix);
                    return;
                };

                window.requestAnimationFrame(() => {

                    const updateElementTransform = () => {
                        let elementTransform = this.elementMatrix.toCss();
                        this.setCssTransform(elementTransform);
                    }

                    if (this.callback) {
                        if (this.callback.call(this, this.elementMatrix)) {
                            updateElementTransform();
                        }
                    } else {
                        updateElementTransform();
                    }

                    this.updateInProgress = false;

                    resolve(this.elementMatrix);
                });

                this.updateInProgress = true;
            });
        }

        /**
         * Sets the element's transform also compensating for various vendor prefixes.
         * 
         * @param {any} cssTansform The CSS transform.
         * 
         * @memberOf TransformStack
         */
        setCssTransform(cssTransform) {

            // Stop listening for DOM changes on style element.
            module.disconnectObserver();

            if (this.element instanceof SVGElement) {
                cssTransform === "none" ? this.element.removeAttribute("transform") : this.element.setAttribute("transform", cssTransform);
            } else if (this.element.nodeType === 1) {
                this.element.style.webkitTransform = cssTransform;
                this.element.style.mozTransform = cssTransform;
                this.element.style.msTransform = cssTransform;
                this.element.style.oTransform = cssTransform;
                this.element.style.transform = cssTransform;
            }

            // Listening for DOM changes on style element.
            module.connectObserver();
        }

        /**
         * tbd.
         * 
         * @returns
         * 
         * @memberOf Transformer
         */
        getTransformHierarchy() {
            const allTransformers = [];

            // Also collect transforms of parents.
            let parent = this.element;
            do {
                if (parent.transformer) {
                    allTransformers.push({
                        transformer: parent.transformer,
                        renderTransform: parent.renderTransform
                    });
                }
            }
            while ((parent = parent.parentElement) != null);

            // Reverse transform order to start with root transform.
            allTransformers.reverse();

            return allTransformers;
        }

        /**
         * tbd.
         * 
         * @param {any} m
         * 
         * @memberOf Transformer
         */
        applyToLocalTransform(m, type = null) {
            this._transforms.apply(m, type);

            if (this.element.renderTransform) {
                this.element.renderTransform.apply(m, type);
            }
        }

        /**
         * tbd.
         * 
         * @param {any} m
         * 
         * @memberOf Transformer
         */
        applyToGlobalTransform(m, type = null) {
            const allTransformers = this.getTransformHierarchy();

            allTransformers.forEach(({ transformer, renderTransform }) => {

                // Undo main transforms.
                if (transformer) {
                    transformer._transforms.unapply(m, type);
                }

                // Undo render transforms.
                if (renderTransform) {
                    renderTransform.unapply(m, type);
                }
            });
        }

        /**
         * Converts a point from global coordinates to local coordinates.
         * 
         * @param {Point} point The point with global x- and y-coordinates.
         * @returns The point with local x- and y-coordinates.
         * 
         * @memberOf TransformStack
         */
        fromGlobalToLocal(point) {

            if (!(point instanceof Point)) {
                throw new Error(`point needs to be of instance ${Point.name}`);
            }

            let m = Matrix.identity(3);
            m.translate(point.x, point.y);

            this.applyToGlobalTransform(m);

            const x = m.tx;
            const y = m.ty;

            return new Point(x, y);
        }

        /**
         * Converts a point from local coordinates to global coordinates.
         * 
         * @param {any} point The point with local x- and y-coordinates.
         * @returns The point with global x- and y-coordinates.
         * 
         * @memberOf TransformStack
         */
        fromLocalToGlobal(point) {
            throw new Error(`not implemented`);
        }

        /**
         * Converts a delta point from global coordinates to local coordinates.
         * 
         * @param {any} point The delta point with global x- and y-coordinates.
         * @returns The delta point with local x- and y-coordinates.
         * 
         * @memberOf TransformStack
         * 
         * @see TransformStack#fromGlobalToLocal
         */
        fromGlobalToLocalDelta(deltaPoint) {

            if (!(deltaPoint instanceof Point)) {
                throw new Error(`delta point needs to be of instance ${Point.name}`);
            }

            const allTransforms = this.getTransformHierarchy();

            let m = Matrix.identity(3);
            m.translate(deltaPoint.x, deltaPoint.y);

            allTransforms.forEach(({ transformer, renderTransform }) => {

                // Undo main transforms.
                if (transformer) {
                    transformer._transforms.unapply(m, ScaleTransform);
                    transformer._transforms.unapply(m, RotateTransform);
                }
            });

            return new Point(m.tx, m.ty);
        }

        /**
         * tbd.
         * 
         * @readonly
         * 
         * @memberOf Transformer
         */
        get localRotation() {
            let m = Matrix.identity(3);
            this.applyToLocalTransform(m, RotateTransform);
            return m.angle;
        }

        /**
         * tbd.
         * 
         * @readonly
         * 
         * @memberOf Transformer
         */
        get globalRotation() {
            let m = Matrix.identity(3);
            this.applyToGlobalTransform(m, RotateTransform);
            return m.angle;
        }

        /**
         * tbd.
         * 
         * @readonly
         * 
         * @memberOf Transformer
         */
        get localScale() {
            let m = Matrix.identity(3);
            this.applyToLocalTransform(m, ScaleTransform);
            return new Point(m.scaleX, m.scaleY);
        }

        /**
         * tbd.
         * 
         * @readonly
         * 
         * @memberOf Transformer
         */
        get globalScale() {
            let m = Matrix.identity(3);
            this.applyToGlobalTransform(m, ScaleTransform);
            return new Point(m.scaleX, m.scaleY);
        }

        /**
         * tbd.
         * 
         * @readonly
         * 
         * @memberOf Transformer
         */
        get globalScaleTest() {
            let m = Matrix.identity(3);
            m.scale(1, 1);

            const allTransformers = [];

            // Also collect transforms of parents.
            let parent = this.element;
            do {
                if (parent.transformer) {
                    allTransformers.push({
                        transformer: parent.transformer,
                        renderTransform: parent.renderTransform
                    });
                }
            }
            while ((parent = parent.parentElement) != null);

            // Apply all transforms in reverse order.
            allTransformers.reverse().forEach(({ transformer, renderTransform }) => {

                // Undo main transforms.
                if (transformer) {
                    transformer._transforms.apply(m, ScaleTransform);
                }

                // Undo render transforms.
                if (renderTransform) {
                    renderTransform.apply(m, ScaleTransform);
                }
            });

            const scaleX = m.a;
            const scaleY = m.d;

            return new Point(scaleX, scaleY);
        }

        /**
         * tbd.
         * 
         * @memberOf Transformer
         */
        destroy() {
            delete this._scaleTransform;
            delete this._rotateTransform;
            delete this._translateTransform;
            delete this._transforms;
        }
    }

    (function() {

        const observerOptions = {
            attributes: true,
            subtree: true,
            attributeFilter: ['style']
        };

        const observer = new MutationObserver(mutations => {

            mutations.forEach(mutation => {
                switch (mutation.type) {
                    case "attributes":
                        const target = mutation.target;
                        if (target.transformer) {
                            target.transformer.refreshTransforms();
                        }
                        break;
                }
            });
        });

        let isConnected = false;

        module.connectObserver = function() {
            if (!isConnected) {
                observer.observe(document.body, observerOptions);
                isConnected = true;
            }
        };

        module.disconnectObserver = function() {
            if (isConnected) {
                observer.disconnect();
                isConnected = false;
            }
        };

        // Listening for DOM changes on style element.
        module.connectObserver();
    })();

    // Export the transform classes to window.Transformer.
    exports.Transformer = {
        Point: Point,
        Matrix: Matrix,
        TranslateTransform: TranslateTransform,
        RotateTransform: RotateTransform,
        ScaleTransform: ScaleTransform,
        TransformGroup: TransformGroup,
        bindElement: (element, callback, debug) => {
            return new Promise((resolve, reject) => {

                if (element.transformer) {
                    return resolve(element.transformer);
                }

                const oldVisbilityValue = element.style.visibility;
                // element.style.visibility = "hidden";

                const makeStack = () => {
                    const transformer = new Transformer(element, callback, debug);

                    transformer.reapplyTransforms()
                        .then(() => {
                            console.debug(`transformer transforms successfully applied %o`, element);
                            // element.style.visibility = oldVisbilityValue;
                            resolve(transformer);
                        })
                        .catch((reason) => {
                            // element.style.visibility = oldVisbilityValue;
                            console.error(`Could not bind ${RenderTransform.name} because "${reason}"`);
                            reject(reason);
                        });
                };

                let runs = 60 * 5; // ca. 5 seconds
                function waitFor() {
                    --runs;

                    if (runs > 0 && (element.offsetWidth === 0 || element.offsetHeight === 0)) {
                        return window.requestAnimationFrame(waitFor);
                    }

                    if (runs <= 0) {
                        console.warn(`could not identify element size width=${element.offsetWidth}, height=${element.offsetHeight}`);
                    }
                    makeStack();
                };
                waitFor();
            });
        }
    };

})(window);