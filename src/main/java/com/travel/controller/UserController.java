package com.travel.controller;

import com.travel.entity.Role;
import com.travel.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserRepository users;

    /** What the admin can see about an account. Never includes the password hash. */
    public record UserView(Long id, String name, String email, Role role) {}

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserView> all() {
        return users.findAll(Sort.by("id")).stream()
                .map(u -> new UserView(u.getId(), u.getName(), u.getEmail(), u.getRole()))
                .toList();
    }
}
