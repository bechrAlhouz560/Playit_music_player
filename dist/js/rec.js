

var Rec = {
    audio_context: null,
    recorder:null,
    interval: null,
    seconds:0,
    recording:false,
    available:false,
    timer: (el)=>{
        var formatTime = videojs.formatTime(Rec.seconds)
        el.text(formatTime);
        Rec.interval = setInterval(()=>{
            Rec.seconds = Rec.seconds + 1;
            var formatTime = videojs.formatTime(Rec.seconds)
            el.text(formatTime);
        },1000)
    },
    init: ()=>{
        try {
            // webkit shim
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
            window.URL = window.URL || window.webkitURL;
            Rec.audio_context = new AudioContext();
            __log('Audio context set up.');
            navigator.getUserMedia({audio:true},()=>{
                Rec.available = true;  
            },(err)=>{
                Rec.available = false;
                console.log(err)
            })
            __log('navigator.getUserMedia ' + (navigator.getUserMedia ? 'available.' : 'not present!'));
        } catch (e) {
            alert('No web audio support in this !');
        }

        navigator.getUserMedia({
            audio: true
        }, Rec.startUserMedia, function (e) {
            __log('No live audio input: ' + e);
        });
    },
    createDownloadLink: ()=>{
        Rec.recorder && Rec.recorder.exportWAV(function (blob) {
            var url = URL.createObjectURL(blob);
            
            blob.arrayBuffer().then((val)=>{
                var Uint16 = new Uint16Array(val);
                
                var voice = new Audio(url);
                getTemplate(templatesUrl.mini.dialogBox,
                {message:"Choose a name for the file:"}
                ,(temp)=>{
                    $('#main').append(temp).ready(()=>{
                        $(".save-btn").click(()=>{
                            var filename = $('.dialog-input').val();
                            if (filename != "")
                            {
                                fs.writeFile(recPath + "/" + filename + ".wav", Uint16, {}, () => {
                                    $('.dialog-cont').remove();
                                    _Recorder.refrech();
                                });
                            } 

                        });
                        voice.onpause = ()=>{
                                $('.c-play-btn').html('<i class="fa fa-play mr-1" aria-hidden="true"></i> Play')
                        }
                        $(".cancel-btn").click(() => {
                             $('.dialog-cont').remove();
                             voice.pause()

                        });
                        $('.c-play-btn').click(()=>{
                            if (voice.paused)
                            {
                                $('.c-play-btn').html('<i class="fa fa-pause mr-1" aria-hidden="true"></i> pause')
                                voice.play()
                            }
                            else
                            {
                                voice.pause()
                                $('.c-play-btn').html('<i class="fa fa-play mr-1" aria-hidden="true"></i> Play')
                            }
                        })
                        
                    })
                })
            })
            
           
            
        });
    },
    startUserMedia : (stream)=> {
        var input = Rec.audio_context.createMediaStreamSource(stream);
        __log('Media stream created.');
        Rec.recorder = new Recorder(input);
        __log('Recorder initialised.');
    },
    start: ()=>{
        if (!Rec.recording)
        {

            Rec.recorder && Rec.recorder.record();
            Rec.timer($(".rec-btn"));
            $(".rec").addClass('recording');
            __log('Recording...');
            Rec.recording = true;

        }
        else
        {
            Rec.recorder && Rec.recorder.stop();
            clearInterval(Rec.interval);
            $(".rec-btn").html('<i class="fa fa-pause" aria-hidden="true"></i>');
            $(".rec").removeClass('recording');
            Rec.recording = false;
        }
        
    },
    stop: ()=>{
        Rec.recorder && Rec.recorder.stop();
        __log('Stopped recording.');
        // create WAV download link using audio data blob
        Rec.createDownloadLink();
        
        Rec.recorder.clear();
        Rec.recording = false;
        Rec.seconds = 0;
        clearInterval(Rec.interval);
        $(".rec-btn").html('<i class="fa fa-microphone" aria-hidden="true"></i>');
            $(".rec").removeClass('recording');

    },
    pause: ()=>{
         Rec.recorder && Rec.recorder.stop();
         clearInterval(Rec.interval);
         $(".rec-btn").html('<i class="fa fa-microphone" aria-hidden="true"></i>');
    }
}
function __log(e, data) {
     console.log(e)
}



window.onload = function () {
  console.log("Start initializing the Recorder...")
  Rec.init()   
};