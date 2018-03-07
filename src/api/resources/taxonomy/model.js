import AbstractModel from '../../modules/abstractModel';

class Taxonomy extends AbstractModel {
  constructor( index = 'taxonomy', type = 'term' ) {
    super( index, type );
  }

  /**
   * Construct a taxonomy tree from a flat array of terms where each term has a parent
   * and an array of child terms (children).
   *
   * @param terms
   * @returns {Array}
   */
  static constructTree( terms, root = null ) {
    const tree = [];
    let ret = tree;
    terms.filter( term => !term.primary ).forEach( ( term ) => {
      const found = terms.find( val => term.parents.includes( val._id ) );
      if ( found ) found.children.push( term );
    } );
    terms.forEach( ( term ) => {
      if ( root ) {
        if ( root === term._id ) ret = term;
      } else if ( term.primary ) tree.push( term );
    } );
    return ret;
  }
}

export default Taxonomy;
