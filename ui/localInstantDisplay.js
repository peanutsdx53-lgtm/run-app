// Presentation only. An instant requires an explicit offset; calendar dates and unknown values are not inferred.
export function formatLocalInstant(value,{language='ja',timeZone}={}){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value))return null;
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return null;
 const en=language==='en';
 const zone=timeZone?{timeZone}:{};
 const day=new Intl.DateTimeFormat(en?'en-GB':'ja-JP',{...zone,year:'numeric',month:en?'short':'2-digit',day:'2-digit'}).format(date);
 const clock=new Intl.DateTimeFormat('en-GB',{...zone,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZoneName:'shortOffset'}).formatToParts(date);
 const part=type=>clock.find(p=>p.type===type)?.value;
 return {date:day,time:[part('hour'),part('minute'),part('second')].join(':'),offset:part('timeZoneName').replace('GMT','UTC')};
}
