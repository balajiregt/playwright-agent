const price=12;
const currency='USD';
document.querySelector('button').addEventListener('click',()=>{
 const quantity=Number(document.querySelector('input').value);
 document.querySelector('[data-testid="quote"]').textContent=`${price*quantity} ${currency}`;
 document.querySelector('[role="status"]').textContent='Calculated';
});
