'use client'
import {shopBundleSalePercent,shopItemSalePercent} from '../../lib/shopSale'
import {fmtPrice} from '../../lib/useCurrency'
export function ShopSaleBadge({percent,style,ribbon=false}){
 if(ribbon) return percent>0?<span className="shop-sale-ribbon"><span>Sale!</span></span>:null
 return percent>0?<span style={{display:'inline-block',border:'1px solid #d988a4',borderRadius:5,padding:'4px 9px',background:'#fff7fa',color:'#923c5a',fontFamily:"'Source Serif 4', Georgia, serif",fontSize:12,fontWeight:600,lineHeight:1.3,...style}}>Sale!</span>:null
}
export default function ShopSalePrice({amount,regular,percent=0,symbol='$',saleColor='#923c5a'}){
 const sale=percent>0&&regular!=null&&Number(regular)>Number(amount)
 return <span style={{display:'inline-flex',alignItems:'baseline',gap:8,flexWrap:'wrap'}}>{sale&&<s style={{opacity:.65,fontSize:'.85em',textDecorationThickness:'1px'}}>{fmtPrice(regular,symbol)}</s>}<span style={{color:sale?saleColor:undefined,fontWeight:sale?600:undefined}}>{fmtPrice(amount,symbol)}</span>{sale&&<span style={{fontSize:'.75em',color:saleColor,fontWeight:600,whiteSpace:'nowrap'}}>{percent}% off</span>}</span>
}

export function ShopProductPrice({product,amount,regular,symbol='$',messageColor='#923c5a'}){
 const bundle=shopBundleSalePercent(product)
 return bundle>0?<span style={{display:'inline-flex',alignItems:'baseline',gap:8,flexWrap:'wrap'}}><span>{fmtPrice(amount,symbol)}</span><span style={{fontSize:'.85em',color:messageColor,fontWeight:600}}>{bundle}% off the bundle</span></span>:<ShopSalePrice amount={amount} regular={regular} percent={shopItemSalePercent(product)} symbol={symbol} saleColor={messageColor}/>
}
