<script>
    // A gente poderia fazer um componente genérico "Modal" e só colocar o conteúdo dentro 
    // dele com propriedades e slots, né?
    // infelizmente não tenho 15 anos de experiência pra saber fazer isso.
    import firmwares from "../firmwares/firmwares";

    import { fly, fade } from "svelte/transition"
    import Button from "./Button.svelte";

    let aberto=false;
    let selecionado="";
    export function abrir(){        
        aberto=true
    }
    function fecharModal(){
        aberto=false
    }
    function selecionar(qual){
        if(selecionado === qual){
            selecionado = ""
            return
        }
        selecionado = qual;
    }
</script>
{#if aberto}
<div class="modal fade {aberto ? "show" : ""}"
    style="display:block; top: 0px; position:fixed; width:100vw; height:100vh; background-color:rgba(0,0,0,0.25)">
    <div class="modal-dialog {aberto ? "show" : ""} modal-lg"
        in:fly={{ x: -200, duration: 200 }}
        out:fade={{ duration: 100 }}>
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="staticBackdropLabel">Lista de firmwares disponíveis</h5>
            </div>
            <div class="modal-body">
                <p>Ainda não consegui integrar esta página com o esptool-js.</p>
                <p>Com essa integração, será possível gravar o interpretador diretamente no ESP32 pelo navegador.</p>
                <p>No momento, baixe os firmwares e grave usando o esptool.py ou esptool-js.</p>
                <ul class="list-group">
                {#each Object.entries(firmwares) as par}
                    <li class="list-group-item">
                        <a href="#" on:click={ () => selecionar(par[0]) }>
                            {par[0]}
                        </a>
                        {#if selecionado == par[0] }
                        <div>
                            {#each Object.entries(par[1]) as bins}
                                <div class="row">
                                    <div class="col">
                                        <a href="/firmware/{par[0]}/{bins[0]}">{bins[0]}</a>
                                    </div>
                                    <div class="col">
                                    {bins[1]}
                                    </div>
                                </div>
                            {/each}
                            </div>
                        {/if}
                    </li>
                {/each}
                </ul>
            </div>
            <div class="modal-footer">
                <Button texto="OK" on:click={fecharModal}/>
            </div>
        </div>
    </div>
</div>
{/if}