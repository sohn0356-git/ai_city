import React from 'react';
export default function ResidentAvatar({id,className=''}){const i=Number(id.slice(1))-1;return <span className={`resident-avatar ${className}`} aria-hidden="true" style={{backgroundImage:`url(${import.meta.env.BASE_URL}tiles/residents-v12.png)`,backgroundPosition:`${i%5*25}% ${Math.floor(i/5)*25}%`}}/>;}
