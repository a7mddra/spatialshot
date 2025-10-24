#include <string>

class AudioManager {
public:
    AudioManager();
    void mute_audio();
    void restore_audio();
private:
    std::string m_audio_backend;
    std::string m_prev_mute_state;
    bool m_audio_muted_by_script = false;
};
