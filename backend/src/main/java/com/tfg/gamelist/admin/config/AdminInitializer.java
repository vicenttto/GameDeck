package com.tfg.gamelist.admin.config;

import com.tfg.gamelist.user.entity.Role;
import com.tfg.gamelist.user.entity.User;
import com.tfg.gamelist.user.repository.RoleRepository;
import com.tfg.gamelist.user.repository.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


@Component
public class AdminInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminInitializer(UserRepository userRepository,
                            RoleRepository roleRepository,
                            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseThrow(() -> new IllegalStateException("ROLE_ADMIN no encontrado en BD"));

        userRepository.findByEmail("admin@gamedeck.com").ifPresentOrElse(
            existing -> {
                if (existing.getRoles().stream().noneMatch(r -> "ROLE_ADMIN".equals(r.getName()))) {
                    existing.getRoles().add(adminRole);
                    userRepository.save(existing);
                }
            },
            () -> {
                User admin = User.builder()
                        .username("admin")
                        .email("admin@gamedeck.com")
                        .passwordHash(passwordEncoder.encode("Admin1234"))
                        .roles(new java.util.HashSet<>(java.util.Set.of(adminRole)))
                        .build();
                userRepository.save(admin);
            }
        );
    }
}
